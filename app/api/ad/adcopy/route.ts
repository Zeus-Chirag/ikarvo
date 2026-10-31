import { NextResponse } from 'next/server';
import { requireActor, consumeQuota } from '@/lib/auth';
import { chat, parseJson, AiError } from '@/lib/ai';
import { refund } from '@/lib/credits';
import { NO_HYPE, briefText } from '@/lib/growth';
import { fail, readJson, str } from '@/lib/http';
export const runtime = 'nodejs';
/** Published platform limits (characters). Over-limit lines are flagged server-side, never silently truncated. */
const LIMITS = {
  meta: { primary: 125, headline: 40, description: 30 }, google: { headline: 30, description: 90 }, linkedin: { primary: 150, headline: 70 },
  tiktok: { primary: 100 }, x: { primary: 280, headline: 70 }, youtube: { headline: 15, description: 90 },
} as const;
type Platform = keyof typeof LIMITS;
export async function POST(req: Request) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  const b = await readJson(req); if (!b) return fail(400, 'Request body must be JSON.');
  const platforms = (Array.isArray(b.platforms) ? b.platforms : ['meta', 'google']).filter((p): p is Platform => typeof p === 'string' && p in LIMITS).slice(0, 6);
  if (!platforms.length) return fail(400, `platforms must include ${Object.keys(LIMITS).join(', ')}.`);
  const limited = await consumeQuota(actor, 30, 'adcopy'); if (limited) return limited;
  try {
    const { content } = await chat({ json: true, temperature: 0.7, maxTokens: 3500, system: `You write paid-social and search ad copy. ${NO_HYPE} Respect these character limits exactly: ${JSON.stringify(Object.fromEntries(platforms.map(p => [p, LIMITS[p]])))}. Give 3 variants per platform, each with a different angle (pain, outcome, proof-free mechanism, contrast). Return strict JSON {"variants":[{"platform":string,"angle":string,"primary"?:string,"headline"?:string,"description"?:string,"cta":string}]}.`,
      user: `Brief:\n${briefText(b.brief)}\nOffer / CTA: ${str(b.offer, 300)}\nAudience: ${str(b.audience, 300)}` });
    const r = parseJson(content) as { variants?: Record<string, string>[] };
    const variants = (r.variants ?? []).filter(v => platforms.includes(v.platform as Platform)).map(v => {
      const lim = LIMITS[v.platform as Platform] as Record<string, number>; const over = Object.entries(lim).filter(([k, n]) => (v[k] ?? '').length > n).map(([k, n]) => `${k} ${(v[k] ?? '').length}/${n}`);
      return { ...v, over };
    });
    return NextResponse.json({ variants, limits: LIMITS });
  } catch (e) { await refund(actor, 'adcopy'); const err = e instanceof AiError ? e : new AiError(String(e)); return fail(err.status, err.message, err.status === 503 ? ['AI_API_KEY'] : undefined); }
}
