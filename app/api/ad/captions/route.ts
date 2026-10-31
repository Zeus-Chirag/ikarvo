import { NextResponse } from 'next/server';
import { requireActor, consumeQuota } from '@/lib/auth';
import { refund } from '@/lib/credits';
import { fail, notConfigured, readJson, str } from '@/lib/http';
import { CAPTIONS, captionsMissing, transcribe, type CaptionProvider } from '@/lib/captions';
export const runtime = 'nodejs'; export const maxDuration = 60;
export async function GET() { return NextResponse.json(Object.fromEntries(Object.entries(CAPTIONS).map(([k, p]) => [k, { label: p.label, missing: captionsMissing(k as CaptionProvider) }]))); }
export async function POST(req: Request) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  const b = await readJson(req); const p = String(b?.provider ?? 'whisper') as CaptionProvider;
  if (!CAPTIONS[p]) return fail(400, 'provider must be whisper or wizper.');
  const miss = captionsMissing(p); if (miss.length) return notConfigured(CAPTIONS[p].label, miss);
  const audio = str(b?.audio, 4_000_000); if (!/^data:(audio|video)\//.test(audio) && !/^https:\/\//.test(audio)) return fail(400, 'Send the audio as a data URL or a public https URL.');
  if (p === 'whisper' && !audio.startsWith('data:')) return fail(400, 'Whisper takes a data URL here.');
  const limited = await consumeQuota(actor, 30, 'captions'); if (limited) return limited;
  try { return NextResponse.json(await transcribe(p, audio, str(b?.language, 5) || undefined)); }
  catch (e) { await refund(actor, 'captions'); return fail((e as { status?: number }).status ?? 502, e instanceof Error ? e.message : String(e)); }
}
