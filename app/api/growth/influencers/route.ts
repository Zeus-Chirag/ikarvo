import { NextResponse } from 'next/server';
import { requireActor } from '@/lib/auth';
import { envValue as v } from '@/lib/env';
import { fail, readJson, str } from '@/lib/http';
export const runtime = 'nodejs';
export const maxDuration = 60;

type Creator = { id: string; platform: 'youtube' | 'x'; name: string; handle: string; url: string; followers: number; avgViews?: number; about: string; sample: string };

async function youtube(q: string): Promise<Creator[]> {
  const key = v('YOUTUBE_API_KEY'); const yt = (p: string) => fetch(`https://www.googleapis.com/youtube/v3/${p}&key=${key}`, { cache: 'no-store' }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(`YouTube ${r.status}: ${d?.error?.message}`); return d; });
  const s = await yt(`search?part=snippet&type=video&order=relevance&maxResults=25&relevanceLanguage=en&q=${encodeURIComponent(q)}`);
  const byChannel = new Map<string, string>(); for (const i of s.items ?? []) if (!byChannel.has(i.snippet.channelId)) byChannel.set(i.snippet.channelId, i.snippet.title);
  if (!byChannel.size) return [];
  const c = await yt(`channels?part=snippet,statistics&id=${[...byChannel.keys()].join(',')}`);
  return (c.items ?? []).map((ch: { id: string; snippet: { title: string; customUrl?: string; description: string }; statistics: { subscriberCount?: string; viewCount?: string; videoCount?: string } }) => ({
    id: `yt:${ch.id}`, platform: 'youtube', name: ch.snippet.title, handle: ch.snippet.customUrl ?? ch.id, url: `https://www.youtube.com/${ch.snippet.customUrl ?? `channel/${ch.id}`}`,
    followers: Number(ch.statistics.subscriberCount ?? 0), avgViews: Math.round(Number(ch.statistics.viewCount ?? 0) / Math.max(1, Number(ch.statistics.videoCount ?? 1))), about: ch.snippet.description.slice(0, 300), sample: byChannel.get(ch.id) ?? '' }));
}
async function x(q: string): Promise<Creator[]> {
  const r = await fetch(`https://api.x.com/2/tweets/search/recent?max_results=50&query=${encodeURIComponent(`${q} -is:retweet -is:reply lang:en`)}&expansions=author_id&user.fields=public_metrics,description,username,name&tweet.fields=public_metrics`, { headers: { Authorization: `Bearer ${v('X_BEARER_TOKEN')}` }, cache: 'no-store' });
  const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(`X search ${r.status}: ${d?.detail ?? d?.title ?? ''}`);
  const sample = new Map<string, string>(); for (const t of d.data ?? []) if (!sample.has(t.author_id)) sample.set(t.author_id, t.text);
  return (d.includes?.users ?? []).map((u: { id: string; name: string; username: string; description: string; public_metrics: { followers_count: number } }) => ({ id: `x:${u.id}`, platform: 'x', name: u.name, handle: `@${u.username}`, url: `https://x.com/${u.username}`, followers: u.public_metrics.followers_count, about: u.description, sample: sample.get(u.id) ?? '' }));
}

export async function POST(req: Request) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  const b = await readJson(req); const q = str(b?.query, 150); if (q.length < 2) return fail(400, 'Enter a niche or topic.');
  const min = Number(b?.minFollowers) || 1000, max = Number(b?.maxFollowers) || 500000;
  const sources: Record<string, string> = {}; const all: Creator[] = [];
  if (!v('YOUTUBE_API_KEY') && !v('X_BEARER_TOKEN')) return fail(503, 'Influencer search needs YOUTUBE_API_KEY and/or X_BEARER_TOKEN.', ['YOUTUBE_API_KEY', 'X_BEARER_TOKEN']);
  await Promise.all([['youtube', v('YOUTUBE_API_KEY') ? youtube : null], ['x', v('X_BEARER_TOKEN') ? x : null]].map(async ([k, fn]) => {
    if (!fn) { sources[k as string] = `not configured (${k === 'youtube' ? 'YOUTUBE_API_KEY' : 'X_BEARER_TOKEN'})`; return; }
    try { all.push(...await (fn as typeof youtube)(q)); sources[k as string] = 'ok'; } catch (e) { sources[k as string] = e instanceof Error ? e.message : String(e); }
  }));
  const creators = all.filter(c => c.followers >= min && c.followers <= max).sort((a, b) => b.followers - a.followers);
  return NextResponse.json({ creators, sources });
}
