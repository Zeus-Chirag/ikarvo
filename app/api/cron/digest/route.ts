import { NextResponse } from 'next/server';
import { envValue } from '@/lib/env';
import { adminClient } from '@/lib/supabase/admin';
import { notify, notifyMissing, NOTIFY, type NotifyChannel } from '@/lib/notify';
import { fail } from '@/lib/http';
export const runtime = 'nodejs';
/** Daily digest to the owner's Telegram/WhatsApp: what is waiting for approval and what went out. */
async function run(req: Request) {
  if (!envValue('CRON_SECRET')) return fail(503, 'CRON_SECRET is not set.', ['CRON_SECRET']);
  if (req.headers.get('authorization') !== `Bearer ${envValue('CRON_SECRET')}`) return fail(401, 'Unauthorized.');
  const owner = envValue('SCHEDULER_OWNER_USER_ID'); const db = adminClient();
  if (!owner || !db) return fail(503, 'Digest needs SCHEDULER_OWNER_USER_ID and SUPABASE_SERVICE_ROLE_KEY.', ['SCHEDULER_OWNER_USER_ID', 'SUPABASE_SERVICE_ROLE_KEY'].filter(k => !envValue(k)));
  const channels = (Object.keys(NOTIFY) as NotifyChannel[]).filter(c => !notifyMissing(c).length);
  if (!channels.length) return fail(503, 'No notification channel configured.', ['TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID', 'or WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_TO']);
  const since = new Date(Date.now() - 864e5).toISOString();
  const { data: posts } = await db.from('posts').select('data').eq('user_id', owner).limit(300);
  const p = (posts ?? []).map(r => r.data as { approved?: boolean; publishedUrl?: string; at?: string; lastError?: string });
  const [arts, threads] = await Promise.all(['articles', 'threads'].map(t => db.from(t).select('id', { count: 'exact', head: true }).eq('user_id', owner).gte('updated_at', since)));
  const text = [`Ikarvo daily brief (${new Date().toISOString().slice(0, 10)})`, `• Published in last 24h: ${p.filter(x => x.publishedUrl && (x.at ?? '') >= since).length}`, `• Waiting for your approval: ${p.filter(x => !x.approved && !x.publishedUrl).length}`,
    `• Approved and queued: ${p.filter(x => x.approved && !x.publishedUrl).length}`, `• Failed posts: ${p.filter(x => x.lastError && !x.publishedUrl).length}`, `• Articles touched: ${arts.count ?? 0} · Community threads: ${threads.count ?? 0}`, `Open: ${envValue('APP_URL') || ''}/app?view=home`].join('\n');
  const results: Record<string, string> = {};
  for (const c of channels) { try { await notify(c, text); results[c] = 'sent'; } catch (e) { results[c] = (e as Error).message; } }
  return NextResponse.json({ results });
}
export const GET = run; export const POST = run;
