import { NextResponse } from 'next/server';
import { requireActor, consumeQuota } from '@/lib/auth';
import { refund } from '@/lib/credits';
import { envValue as v } from '@/lib/env';
import { fail, notConfigured, readJson, str } from '@/lib/http';
export const runtime = 'nodejs'; export const maxDuration = 30;
/**
 * Higgsfield API (docs.higgsfield.ai): async model endpoints on https://api.higgsfield.ai, `Authorization: Key {id}:{secret}`,
 * returns request_id; poll /requests/{id}/status until completed | failed | nsfw | canceled. Used here for Soul presenter portraits
 * that then feed the lip-sync models (OmniHuman / SadTalker). Model is overridable with HIGGSFIELD_IMAGE_MODEL.
 */
const KEYS = ['HF_API_KEY_ID', 'HF_API_KEY_SECRET'];
const auth = () => ({ Authorization: `Key ${v('HF_API_KEY_ID')}:${v('HF_API_KEY_SECRET')}`, 'Content-Type': 'application/json' });
const missing = () => KEYS.filter(k => !v(k));
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ label: 'Higgsfield Soul', missing: missing() });
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  if (missing().length) return notConfigured('Higgsfield', missing());
  if (!/^[\w-]+$/.test(id)) return fail(400, 'Invalid request id.');
  const r = await fetch(`https://api.higgsfield.ai/requests/${id}/status`, { headers: auth(), cache: 'no-store' }); const d = await r.json().catch(() => ({}));
  if (!r.ok) return fail(502, `Higgsfield error (${r.status}): ${d?.detail ?? d?.message ?? 'request failed'}`);
  const url = d.images?.[0]?.url ?? d.video?.url;
  return NextResponse.json({ id, status: d.status === 'completed' ? 'succeeded' : ['failed', 'nsfw', 'canceled'].includes(d.status) ? 'failed' : 'running', url, error: d.status === 'nsfw' ? 'Blocked by Higgsfield safety filter.' : d.error ?? undefined });
}
export async function POST(req: Request) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  if (missing().length) return notConfigured('Higgsfield', missing());
  const b = await readJson(req); const prompt = str(b?.prompt, 1500); if (prompt.length < 5) return fail(400, 'Describe the presenter.');
  const limited = await consumeQuota(actor, 20, 'media'); if (limited) return limited;
  const r = await fetch(`https://api.higgsfield.ai/${v('HIGGSFIELD_IMAGE_MODEL') || 'higgsfield-ai/soul/v2/standard'}`, { method: 'POST', headers: { ...auth(), 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ prompt }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.request_id) { await refund(actor, 'media'); return fail(502, `Higgsfield error (${r.status}): ${d?.detail ?? d?.message ?? 'request failed'}`); }
  return NextResponse.json({ id: d.request_id, status: 'queued' });
}
