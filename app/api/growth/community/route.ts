import { NextResponse } from 'next/server';
import { requireActor } from '@/lib/auth';
import { envValue } from '@/lib/env';
import { fail, readJson, str } from '@/lib/http';
export const runtime = 'nodejs';

type Thread = { id: string; source: 'reddit' | 'hackernews'; community: string; title: string; text: string; url: string; score: number; comments: number; createdAt: string };
const day = 86400;
const decode = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();

async function hn(q: string, days: number): Promise<Thread[]> {
  const u = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(q)}&tags=(story,ask_hn,show_hn)&numericFilters=created_at_i>${Math.floor(Date.now() / 1000) - days * day}&hitsPerPage=20`;
  const r = await fetch(u, { cache: 'no-store', signal: AbortSignal.timeout(10000) }); if (!r.ok) throw new Error(`HN search HTTP ${r.status}`);
  const d = await r.json();
  return (d.hits ?? []).map((h: Record<string, unknown>) => ({ id: `hn:${h.objectID}`, source: 'hackernews', community: 'Hacker News', title: decode(String(h.title ?? h.story_title ?? '')), text: decode(String(h.story_text ?? '')).slice(0, 1500),
    url: `https://news.ycombinator.com/item?id=${h.objectID}`, score: Number(h.points ?? 0), comments: Number(h.num_comments ?? 0), createdAt: String(h.created_at) }));
}
let redditToken: { v: string; exp: number } | null = null;
async function reddit(q: string, days: number, subs: string[] = []): Promise<Thread[]> {
  const id = envValue('REDDIT_CLIENT_ID'), secret = envValue('REDDIT_CLIENT_SECRET'); const ua = 'web:ikarvo:1.0 (community radar)';
  let base = 'https://www.reddit.com'; const headers: Record<string, string> = { 'User-Agent': ua };
  if (id && secret) {
    if (!redditToken || redditToken.exp < Date.now()) {
      const t = await fetch('https://www.reddit.com/api/v1/access_token', { method: 'POST', body: 'grant_type=client_credentials', headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': ua } }).then(r => r.json());
      if (!t.access_token) throw new Error('Reddit OAuth failed. Check REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET.');
      redditToken = { v: t.access_token, exp: Date.now() + (t.expires_in - 60) * 1000 };
    }
    base = 'https://oauth.reddit.com'; headers.Authorization = `Bearer ${redditToken.v}`;
  }
  const t = days <= 1 ? 'day' : days <= 7 ? 'week' : days <= 31 ? 'month' : 'year';
  if (subs.length) { const per = await Promise.all(subs.slice(0, 8).map(sr => fetch(`${base}/r/${encodeURIComponent(sr)}/search.json?q=${encodeURIComponent(q)}&restrict_sr=1&sort=new&t=${t}&limit=10&type=link`, { headers, cache: 'no-store', signal: AbortSignal.timeout(10000) })));
    const bad = per.find(r => !r.ok); if (bad) throw new Error(bad.status === 403 || bad.status === 429 ? `Reddit blocked anonymous access (HTTP ${bad.status}). Add REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET.` : `Reddit HTTP ${bad.status}`);
    const all = await Promise.all(per.map(r => r.json())); return all.flatMap(d => (d.data?.children ?? []).map(({ data: p }: { data: Record<string, unknown> }) => ({ id: `rd:${p.id}`, source: 'reddit' as const, community: `r/${p.subreddit}`, title: decode(String(p.title)), text: decode(String(p.selftext ?? '')).slice(0, 1500), url: `https://www.reddit.com${p.permalink}`, score: Number(p.score ?? 0), comments: Number(p.num_comments ?? 0), createdAt: new Date(Number(p.created_utc) * 1000).toISOString() }))); }
  const r = await fetch(`${base}/search.json?q=${encodeURIComponent(q)}&sort=new&t=${t}&limit=25&type=link`, { headers, cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error(r.status === 403 || r.status === 429 ? `Reddit blocked anonymous access (HTTP ${r.status}). Add REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET (a free "script" app) for reliable results.` : `Reddit HTTP ${r.status}`);
  const d = await r.json();
  return (d.data?.children ?? []).map(({ data: p }: { data: Record<string, unknown> }) => ({ id: `rd:${p.id}`, source: 'reddit', community: `r/${p.subreddit}`, title: decode(String(p.title)), text: decode(String(p.selftext ?? '')).slice(0, 1500),
    url: `https://www.reddit.com${p.permalink}`, score: Number(p.score ?? 0), comments: Number(p.num_comments ?? 0), createdAt: new Date(Number(p.created_utc) * 1000).toISOString() }));
}
const INTENT = /\b(looking for|recommend|alternative|any (tool|app)|how do (i|you)|best (way|tool)|struggl|frustrat|need (a|help)|anyone (use|tried)|vs\.?|which)\b/i;

export async function POST(req: Request) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  const b = await readJson(req); const q = str(b?.query, 200); if (q.length < 2) return fail(400, 'Enter keywords to listen for.');
  const days = Math.min(365, Math.max(1, Number(b?.days) || 30));
  const subs = (Array.isArray(b?.subreddits) ? b.subreddits : []).map((x: unknown) => String(x).replace(/^r\//, '').replace(/[^\w]/g, '')).filter(Boolean);
  const [h, r] = await Promise.allSettled([b?.sources === 'reddit' ? Promise.resolve([]) : hn(q, days), reddit(q, days, subs)]);
  const threads = [...(h.status === 'fulfilled' ? h.value : []), ...(r.status === 'fulfilled' ? r.value : [])]
    .map(t => ({ ...t, intent: INTENT.test(`${t.title} ${t.text}`) })).sort((a, b) => Number(b.intent) - Number(a.intent) || b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json({ threads, sources: { hackernews: h.status === 'fulfilled' ? 'ok' : String((h as PromiseRejectedResult).reason?.message ?? h), reddit: r.status === 'fulfilled' ? (envValue('REDDIT_CLIENT_ID') ? 'ok (OAuth)' : 'ok (anonymous)') : String((r as PromiseRejectedResult).reason?.message) } });
}
