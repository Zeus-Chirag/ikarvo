import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { requireActor } from '@/lib/auth';
import { normalizeUrl, safeFetch } from '@/lib/site';
import { fail, readJson, str } from '@/lib/http';
export const runtime = 'nodejs';
export const maxDuration = 90;
const strip = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
/** Responsive sites often repeat a heading 2-3 times in one element; keep one copy. */
const dedupe = (s: string) => { for (const n of [3, 2]) { const w = s.split(' '); if (w.length % n) continue; const k = w.length / n, part = w.slice(0, k).join(' '); if (Array.from({ length: n }, (_, i) => w.slice(i * k, (i + 1) * k).join(' ')).every(x => x === part)) return part; } return s; };

async function snap(u: URL) {
  try { const { res, url } = await safeFetch(u, 10000); if (!res.ok) return { url: url.toString(), status: res.status };
    const html = (await res.text()).slice(0, 2_000_000); const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ');
    const title = strip(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
    const desc = html.match(/<meta[^>]+name=["']description["'][^>]*>/i)?.[0].match(/content=["']([^"']*)/i)?.[1] ?? '';
    const heads = [...body.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi)].map(m => dedupe(strip(m[1]))).filter(Boolean).slice(0, 15);
    const text = strip(body.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? body);
    const prices = [...new Set(text.match(/(?:[$€£₹]\s?\d[\d,.]*(?:\s?\/\s?(?:mo|month|yr|year|user|seat))?)/gi) ?? [])].slice(0, 20);
    const ctas = [...new Set([...body.matchAll(/<(?:a|button)[^>]*>([\s\S]{2,60}?)<\/(?:a|button)>/gi)].map(m => strip(m[1])).filter(t => /start|try|get|book|sign|demo|free|buy/i.test(t) && t.length < 40))].slice(0, 8);
    return { url: url.toString(), status: res.status, title, desc, heads, prices, ctas, words: text.split(/\s+/).length, hash: createHash('sha1').update(heads.join('|') + prices.join('|') + title).digest('hex').slice(0, 12) };
  } catch (e) { return { url: u.toString(), status: 0, error: e instanceof Error ? e.message : String(e) }; }
}
/** Snapshots competitor homepage + /pricing. Diffing against earlier snapshots happens client-side. No key needed. */
export async function POST(req: Request) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  const b = await readJson(req); const urls = (Array.isArray(b?.urls) ? b.urls : []).map((x: unknown) => str(x, 300)).filter(Boolean).slice(0, 8);
  if (!urls.length) return fail(400, 'Add at least one competitor URL.');
  const out = await Promise.all(urls.map(async (raw: string) => { let u: URL; try { u = normalizeUrl(raw); } catch { return { input: raw, error: 'Invalid URL' }; }
    const [home, pricing] = await Promise.all([snap(u), snap(new URL('/pricing', u.origin))]); return { input: raw, domain: u.hostname, home, pricing, at: new Date().toISOString() }; }));
  return NextResponse.json({ snapshots: out });
}
