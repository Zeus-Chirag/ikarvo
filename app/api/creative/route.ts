import { refund } from '@/lib/credits';
import { NextResponse } from 'next/server';
import { requireActor, consumeQuota } from '@/lib/auth';
import { chat, parseJson, AiError } from '@/lib/ai';
import { fail, readJson, str } from '@/lib/http';
export const runtime = 'nodejs';
export const maxDuration = 90;

const SYSTEM = `You are a performance creative director writing short-form video ads (UGC, motion graphics, launch ads).
Be truthful: never invent testimonials, metrics, prices or features that the brief does not state. Mark assumptions.
Return strict JSON:
{"title":string,"hooks":[string,string,string],
 "script":[{"time":"0-3s","shot":string,"voiceover":string,"caption":string}],
 "motion":[{"headline":string,"sub":string}],
 "ctas":[string,string,string],
 "imagePrompt":string,"videoPrompt":string,
 "checklist":[string]}
"motion" is 4-6 short scenes for an animated text ad (headline <= 6 words, sub <= 12 words).
imagePrompt/videoPrompt describe a single visual for an image or video model (no text overlays, no real people's likeness).`;

export async function POST(req: Request) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  const b = await readJson(req); if (!b) return fail(400, 'Request body must be JSON.');
  const product = str(b.product, 3000);
  if (product.length < 8) return fail(400, 'Describe the product in at least a sentence.');
  const limited = await consumeQuota(actor, 30, 'creative'); if (limited) return limited;
  try {
    const { content, model } = await chat({ system: SYSTEM, json: true, temperature: 0.7, maxTokens: 2500,
      user: `Format: ${str(b.format, 80) || 'UGC'}\nPlatform: ${str(b.platform, 80)}\nProduct: ${product}\nAudience: ${str(b.audience, 400)}\nTone: ${str(b.tone, 160)}` });
    return NextResponse.json({ concept: parseJson(content), model });
  } catch (e) { await refund(actor, 'creative'); const err = e instanceof AiError ? e : new AiError(String(e)); return fail(err.status, err.message, err.status === 503 ? ['AI_API_KEY'] : undefined); }
}
