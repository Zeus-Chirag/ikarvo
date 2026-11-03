import 'server-only';
import { envValue } from '@/lib/env';
import { webSearch } from '@/lib/search';

export type Thread = { id: string; source: 'reddit' | 'hackernews'; community: string; title: string; text: string; url: string; score: number; comments: number; createdAt: string };
const day = 86400;
const decode = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();

export async function hn(q: string, days: number): Promise<Thread[]> {
  const u = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=(story,ask_hn,show_hn)&numericFilters=created_at_i>${Math.floor(Date.now() / 1000) - days * day}&hitsPerPage=20`;
  const r = await fetch(u, { cache: 'no-store', signal: AbortSignal.timeout(10000) }); if (!r.ok) throw new Error(`HN search HTTP ${r.status}`);
  const d = await r.json();
  return (d.hits ?? []).map((h: Record<string, unknown>) => ({ id: `hn:${h.objectID}`, source: 'hackernews', community: 'Hacker News', title: decode(String(h.title ?? h.story_title ?? '')), text: decode(String(h.story_text ?? '')).slice(0, 1500),
    url: `https://news.ycombinator.com/item?id=${h.objectID}`, score: Number(h.points ?? 0), comments: Number(h.num_comments ?? 0), createdAt: String(h.created_at) }));
}
const rssText = (s: string) => decode(s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
/** Reddit's public RSS search works where anonymous JSON is blocked (403). */
async function redditRss(q: string, t: string, sub?: string): Promise<Thread[]> {
  const r = await fetch(`https://www.reddit.com/${sub ? `r/${encodeURIComponent(sub)}/` : ''}search.rss?q=${encodeURIComponent(`"${q}"`)}&sort=relevance&t=${t}${sub ? '&restrict_sr=1' : ''}&type=link`, { headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36' }, cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error(`Reddit is rate-limiting searches right now (HTTP ${r.status}). Try again shortly, or add REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET.`);
  const xml = await r.text();
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => { const e = m[1]; const url = e.match(/<link href="([^"]+)"/)?.[1] ?? ''; const id = url.match(/comments\/(\w+)/)?.[1] ?? url;
    return { id: `rd:${id}`, source: 'reddit' as const, community: `r/${e.match(/<category term="([^"]+)"/)?.[1] ?? url.match(/\/r\/([^/]+)/)?.[1] ?? 'reddit'}`, title: rssText(e.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ''),
      text: rssText(e.match(/<content[^>]*>([\s\S]*?)<\/content>/)?.[1] ?? '').replace(/submitted by[\s\S]*$/, '').trim().slice(0, 1500), url, score: 0, comments: 0, createdAt: new Date(e.match(/<(?:published|updated)>([^<]+)</)?.[1] ?? Date.now()).toISOString() }; })
    .filter(x => x.url.includes('/comments/'));
}
let redditToken: { v: string; exp: number } | null = null;
export async function reddit(q: string, days: number, subs: string[] = []): Promise<Thread[]> {
  const id = envValue('REDDIT_CLIENT_ID'), secret = envValue('REDDIT_CLIENT_SECRET'); const ua = 'web:ikarvo:1.0 (community radar)';
  let base = 'https://www.reddit.com'; const headers: Record<string, string> = { 'User-Agent': ua };
  if (id && secret) {
    if (!redditToken || redditToken.exp < Date.now()) {
      const t = await fetch('https://www.reddit.com/api/v1/access_token', { method: 'POST', body: 'grant_type=client_credentials', headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': ua } }).then(r => r.json());
      if (!t.access_token) throw new Error('Reddit search is unavailable right now. Try again later.');
      redditToken = { v: t.access_token, exp: Date.now() + (t.expires_in - 60) * 1000 };
    }
    base = 'https://oauth.reddit.com'; headers.Authorization = `Bearer ${redditToken.v}`;
  }
  const t = days <= 1 ? 'day' : days <= 7 ? 'week' : days <= 31 ? 'month' : 'year';
  if (!headers.Authorization) {
    // Anonymous JSON is blocked from cloud IPs: use RSS, keep only on-topic posts, and top up from web search.
    const terms = q.toLowerCase().split(/\W+/).filter(w => w.length > 2); const onTopic = (x: Thread) => { const ti = x.title.toLowerCase(), all = `${ti} ${x.text.toLowerCase()}`; return all.includes(q.toLowerCase()) || terms.every(w => ti.includes(w)) || (terms.length > 2 && terms.filter(w => ti.includes(w)).length >= terms.length - 1); };
    const json = await redditJson().catch(() => [] as Thread[]);
    const rss = [...json, ...(await (subs.length ? Promise.all(subs.slice(0, 8).map(sr => redditRss(q, t, sr).catch(() => []))).then(x => x.flat()) : redditRss(q, t).catch(() => [])))].filter(onTopic);
    if (rss.length >= 5) return rss;
    const web = (await webSearch(`site:reddit.com ${subs.length ? `(${subs.map(s => `r/${s}`).join(' OR ')}) ` : ''}${q}`, 20).catch(() => [])).filter(h => /reddit\.com\/r\/[^/]+\/comments\//.test(h.url));
    const seen = new Set(rss.map(x => x.url.split('?')[0]));
    return [...rss, ...web.filter(h => !seen.has(h.url)).map(h => ({ id: `rd:${h.url.match(/comments\/(\w+)/)?.[1] ?? h.url}`, source: 'reddit' as const, community: `r/${h.url.match(/\/r\/([^/]+)/)?.[1]}`, title: h.title.replace(/^r\/\w+ on Reddit: /, '').replace(/\s*:\s*r\/\w+\s*-\s*Reddit$|\s*-\s*Reddit$/, ''), text: h.snippet.replace(/^\d{1,2} \w+ \d{4} - /, ''), url: h.url, score: 0, comments: 0, createdAt: (() => { const d = Date.parse(h.snippet.match(/^(\d{1,2} \w+ \d{4})/)?.[1] ?? ''); return isNaN(d) ? new Date(0).toISOString() : new Date(d).toISOString(); })() }))];
  }
  return redditJson();
  async function redditJson(): Promise<Thread[]> {
  if (subs.length) { const per = await Promise.all(subs.slice(0, 8).map(sr => fetch(`${base}/r/${encodeURIComponent(sr)}/search.json?q=${encodeURIComponent(q)}&restrict_sr=1&sort=new&t=${t}&limit=10&type=link`, { headers, cache: 'no-store', signal: AbortSignal.timeout(10000) })));
    const bad = per.find(r => !r.ok); if (bad) throw new Error(bad.status === 403 || bad.status === 429 ? `Reddit blocked anonymous access (HTTP ${bad.status}). Add REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET.` : `Reddit HTTP ${bad.status}`);
    const all = await Promise.all(per.map(r => r.json())); return all.flatMap(d => (d.data?.children ?? []).map(({ data: p }: { data: Record<string, unknown> }) => ({ id: `rd:${p.id}`, source: 'reddit' as const, community: `r/${p.subreddit}`, title: decode(String(p.title)), text: decode(String(p.selftext ?? '')).slice(0, 1500), url: `https://www.reddit.com${p.permalink}`, score: Number(p.score ?? 0), comments: Number(p.num_comments ?? 0), createdAt: new Date(Number(p.created_utc) * 1000).toISOString() }))); }
  const r = await fetch(`${base}/search.json?q=${encodeURIComponent(q)}&sort=new&t=${t}&limit=25&type=link`, { headers, cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error(r.status === 403 || r.status === 429 ? `Reddit blocked anonymous access (HTTP ${r.status}). Add REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET (a free "script" app) for reliable results.` : `Reddit HTTP ${r.status}`);
  const d = await r.json();
  return (d.data?.children ?? []).map(({ data: p }: { data: Record<string, unknown> }) => ({ id: `rd:${p.id}`, source: 'reddit', community: `r/${p.subreddit}`, title: decode(String(p.title)), text: decode(String(p.selftext ?? '')).slice(0, 1500),
    url: `https://www.reddit.com${p.permalink}`, score: Number(p.score ?? 0), comments: Number(p.num_comments ?? 0), createdAt: new Date(Number(p.created_utc) * 1000).toISOString() }));
  }
}
export const INTENT = /\b(looking for|recommend|alternative|any (tool|app)|how do (i|you)|best (way|tool)|struggl|frustrat|need (a|help)|anyone (use|tried)|vs\.?|which)\b/i;

