import { NextResponse } from 'next/server';
import { envValue } from '@/lib/env';
import { fail } from '@/lib/http';
import { adminClient } from '@/lib/supabase/admin';
import { SOCIAL, NotConfigured } from '@/lib/publishers';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type PostData = { channel: string; at?: string; text: string; hashtags?: string[]; mediaUrl?: string; approved?: boolean; done?: boolean; publishedUrl?: string; attempts?: number; lastError?: string };
const CHANNEL: Record<string, string> = { X: 'x', LinkedIn: 'linkedin', Threads: 'threads', Bluesky: 'bluesky', Facebook: 'facebook', Instagram: 'instagram', TikTok: 'tiktok' };

/**
 * Background publisher (Vercel Cron or any scheduler). Publishes posts that are approved, due and not yet published.
 * Single-owner: publishing tokens are server env vars, so only SCHEDULER_OWNER_USER_ID's posts are ever auto-published.
 */
async function run(req: Request) {
  const secret = envValue('CRON_SECRET'); if (!secret) return fail(503, 'CRON_SECRET is not set.', ['CRON_SECRET']);
  if (req.headers.get('authorization') !== `Bearer ${secret}`) return fail(401, 'Unauthorized.');
  const owner = envValue('SCHEDULER_OWNER_USER_ID'); if (!owner) return fail(503, 'SCHEDULER_OWNER_USER_ID is not set.', ['SCHEDULER_OWNER_USER_ID']);
  const db = adminClient(); if (!db) return fail(503, 'SUPABASE_SERVICE_ROLE_KEY is required for the scheduler.', ['SUPABASE_SERVICE_ROLE_KEY']);
  const now = new Date().toISOString();
  const { data, error } = await db.from('posts').select('id,title,data').eq('user_id', owner).eq('data->>approved', 'true').lte('data->>at', now).limit(25);
  if (error) return fail(500, error.message);
  const results = [];
  for (const row of (data ?? []) as { id: string; title: string; data: PostData }[]) {
    const p = row.data; if (p.done || p.publishedUrl || (p.attempts ?? 0) >= 3) continue;
    const pub = SOCIAL[CHANNEL[p.channel] ?? '']; const text = `${p.text}${p.hashtags?.length ? `\n\n${p.hashtags.map(h => `#${h.replace(/^#/, '')}`).join(' ')}` : ''}`;
    let next: PostData;
    if (!pub) next = { ...p, attempts: 3, lastError: `${p.channel} has no publishing API; post manually.` };
    else try { const r = await pub.publish({ text, mediaUrl: p.mediaUrl }); next = { ...p, done: true, publishedUrl: r.url ?? r.id ?? 'published', lastError: undefined }; }
    catch (e) { next = { ...p, attempts: (p.attempts ?? 0) + (e instanceof NotConfigured ? 3 : 1), lastError: e instanceof Error ? e.message : String(e) }; }
    await db.from('posts').update({ data: next }).eq('id', row.id);
    results.push({ id: row.id, channel: p.channel, ok: !!next.done, error: next.lastError });
  }
  return NextResponse.json({ checked: data?.length ?? 0, results, at: now });
}
export const GET = run; export const POST = run;
