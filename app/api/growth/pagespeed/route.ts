import { NextResponse } from 'next/server';
import { requireActor } from '@/lib/auth';
import { envValue } from '@/lib/env';
import { normalizeUrl } from '@/lib/site';
import { fail, readJson, str } from '@/lib/http';
export const runtime = 'nodejs';
export const maxDuration = 90;
/** Lighthouse scores via Google PageSpeed Insights (works without a key at low volume; PAGESPEED_API_KEY raises limits). */
export async function POST(req: Request) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  const b = await readJson(req); let u: URL; try { u = normalizeUrl(str(b?.url, 400)); } catch { return fail(400, 'Enter a valid URL.'); }
  const strategy = b?.strategy === 'desktop' ? 'desktop' : 'mobile';
  const q = new URLSearchParams({ url: u.toString(), strategy }); ['performance', 'accessibility', 'best-practices', 'seo'].forEach(c => q.append('category', c)); if (envValue('PAGESPEED_API_KEY')) q.set('key', envValue('PAGESPEED_API_KEY'));
  const r = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${q}`, { signal: AbortSignal.timeout(80000) }).catch(e => e as Error);
  if (r instanceof Error) return fail(504, `PageSpeed timed out: ${r.message}`);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) return fail(r.status === 429 ? 503 : 502, `PageSpeed error (${r.status}): ${d?.error?.message ?? ''}`, r.status === 429 ? ['PAGESPEED_API_KEY'] : undefined);
  const c = d.lighthouseResult?.categories ?? {}; const s = (k: string) => c[k]?.score == null ? null : Math.round(c[k].score * 100);
  return NextResponse.json({ url: u.toString(), strategy, scores: { performance: s('performance'), accessibility: s('accessibility'), bestPractices: s('best-practices'), seo: s('seo') }, at: new Date().toISOString() });
}
