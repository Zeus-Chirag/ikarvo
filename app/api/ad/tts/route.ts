import { NextResponse } from 'next/server';
import { requireActor, consumeQuota } from '@/lib/auth';
import { refund } from '@/lib/credits';
import { fail, notConfigured, readJson, str } from '@/lib/http';
import { TTS, speak, ttsMissing, type TtsProvider } from '@/lib/tts';
export const runtime = 'nodejs'; export const maxDuration = 60;
export async function GET() { return NextResponse.json(Object.fromEntries(Object.entries(TTS).map(([k, p]) => [k, { label: p.label, missing: ttsMissing(k as TtsProvider) }]))); }
export async function POST(req: Request) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  const b = await readJson(req); const provider = String(b?.provider ?? 'elevenlabs') as TtsProvider;
  if (!TTS[provider]) return fail(400, 'provider must be elevenlabs or openai.');
  const miss = ttsMissing(provider); if (miss.length) return notConfigured(TTS[provider].label, miss);
  const text = str(b?.text, 2500); if (text.length < 3) return fail(400, 'Write the voiceover script first.');
  const limited = await consumeQuota(actor, 30, 'tts'); if (limited) return limited;
  try { return NextResponse.json(await speak(provider, text, str(b?.voice, 80) || undefined)); }
  catch (e) { await refund(actor, 'tts'); return fail(502, e instanceof Error ? e.message : String(e)); }
}
