import { NextResponse } from 'next/server';
import { requireActor } from '@/lib/auth';
import { normalizeUrl, safeFetch } from '@/lib/site';
import { fail, readJson, str } from '@/lib/http';
export const runtime = 'nodejs';
/** Extracts real design signals (colors, fonts, theme color, logo) from a site's HTML and first stylesheets. No key. */
export async function POST(req: Request) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  const b = await readJson(req); let u: URL; try { u = normalizeUrl(str(b?.url, 400)); } catch { return fail(400, 'Enter a valid URL.'); }
  try {
    const { res, url } = await safeFetch(u, 12000); const html = (await res.text()).slice(0, 1_500_000);
    const sheets = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)].map(m => m[1]).slice(0, 3);
    let css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]).join('\n');
    for (const h of sheets) { try { const r = await safeFetch(new URL(h, url), 8000); css += '\n' + (await r.res.text()).slice(0, 600_000); } catch {} }
    const all = css + html;
    const counts = new Map<string, number>(); for (const m of all.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) { let h = m[1].toLowerCase(); if (h.length === 3) h = h.split('').map(x => x + x).join(''); counts.set(`#${h}`, (counts.get(`#${h}`) ?? 0) + 1); }
    const colors = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([hex, n]) => ({ hex, uses: n }));
    const fonts = [...new Set([...all.matchAll(/font-family\s*:\s*([^;}{]+)/gi)].map(m => m[1].split(',')[0].replace(/["']/g, '').trim()).filter(f => f && !/^var\(|inherit|initial/.test(f)))].slice(0, 8);
    const theme = html.match(/<meta[^>]+name=["']theme-color["'][^>]*content=["']([^"']+)/i)?.[1] ?? null;
    const logo = html.match(/<link[^>]+rel=["'](?:apple-touch-icon|icon)["'][^>]*href=["']([^"']+)/i)?.[1]; const og = html.match(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)/i)?.[1];
    return NextResponse.json({ url: url.toString(), colors, fonts, themeColor: theme, logo: logo ? new URL(logo, url).toString() : null, ogImage: og ? new URL(og, url).toString() : null, stylesheets: sheets.length });
  } catch (e) { return fail(502, e instanceof Error ? e.message : String(e)); }
}
