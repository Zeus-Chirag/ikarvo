import { NextResponse } from 'next/server';
import { requireActor } from '@/lib/auth';
import { envValue } from '@/lib/env';
import { hn, reddit, INTENT, relevance } from '@/lib/community';
import { fail, readJson, str } from '@/lib/http';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  const b = await readJson(req); const q = str(b?.query, 200); if (q.length < 2) return fail(400, 'Enter keywords to listen for.');
  const days = Math.min(365, Math.max(1, Number(b?.days) || 30));
  const subs = (Array.isArray(b?.subreddits) ? b.subreddits : []).map((x: unknown) => String(x).replace(/^r\//, '').replace(/[^\w]/g, '')).filter(Boolean);
  const [h, r] = await Promise.allSettled([b?.sources === 'reddit' ? Promise.resolve([]) : hn(q, days), reddit(q, days, subs)]);
  const threads = [...(h.status === 'fulfilled' ? h.value : []), ...(r.status === 'fulfilled' ? r.value : [])]
    .map(t => ({ ...t, intent: INTENT.test(`${t.title} ${t.text}`), rel: relevance(t, q) })).sort((a, b) => (b.rel + (b.intent ? 1.5 : 0)) - (a.rel + (a.intent ? 1.5 : 0)) || b.createdAt.localeCompare(a.createdAt)).map(({ rel: _r, ...t }) => t);
  return NextResponse.json({ threads, sources: { hackernews: h.status === 'fulfilled' ? 'ok' : String((h as PromiseRejectedResult).reason?.message ?? h), reddit: r.status === 'fulfilled' ? (envValue('REDDIT_CLIENT_ID') ? 'ok (OAuth)' : 'ok (public)') : String((r as PromiseRejectedResult).reason?.message) } });
}
