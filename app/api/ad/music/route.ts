import { NextResponse } from 'next/server';
import { requireActor, consumeQuota } from '@/lib/auth';
import { refund } from '@/lib/credits';
import { fail, notConfigured, readJson, str } from '@/lib/http';
import { MUSIC, musicMissing, compose, type MusicProvider } from '@/lib/music';
export const runtime = 'nodejs'; export const maxDuration = 60;
export async function GET() { return NextResponse.json(Object.fromEntries(Object.entries(MUSIC).map(([k, p]) => [k, { label: p.label, missing: musicMissing(k as MusicProvider) }]))); }
export async function POST(req: Request) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  const b = await readJson(req); const p = String(b?.provider ?? 'elevenlabs') as MusicProvider;
  if (!MUSIC[p]) return fail(400, 'provider must be elevenlabs or stableaudio.');
  const miss = musicMissing(p); if (miss.length) return notConfigured(MUSIC[p].label, miss);
  const prompt = str(b?.prompt, 600); if (prompt.length < 4) return fail(400, 'Describe the music (genre, mood, tempo).');
  const limited = await consumeQuota(actor, 20, 'music'); if (limited) return limited;
  try { return NextResponse.json(await compose(p, prompt, Number(b?.seconds) || 20)); }
  catch (e) { await refund(actor, 'music'); return fail(502, e instanceof Error ? e.message : String(e)); }
}
