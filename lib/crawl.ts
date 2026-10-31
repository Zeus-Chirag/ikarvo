import 'server-only';
import { safeFetch, normalizeUrl } from '@/lib/site';

export type PageIssue = { code: string; severity: 'high' | 'medium' | 'low'; message: string };
export type PageReport = { url: string; status: number; ms: number; title: string; description: string; h1: string[]; words: number; canonical: string; noindex: boolean; hasSchema: boolean; ogImage: boolean; imagesNoAlt: number; issues: PageIssue[] };
export type CrawlReport = { origin: string; discoveredBy: 'sitemap' | 'links'; sitemapUrls: number; pages: PageReport[]; siteIssues: PageIssue[]; score: number; capped: boolean; at: string };

const strip = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const meta = (h: string, k: string) => h.match(new RegExp(`<meta[^>]+(?:name|property)=["']${k}["'][^>]*>`, 'i'))?.[0].match(/content=["']([^"']*)["']/i)?.[1]?.trim() ?? '';

async function text(u: URL, ms = 8000) { try { const r = await safeFetch(u, ms); return r.res.ok ? (await r.res.text()).slice(0, 3_000_000) : null; } catch { return null; } }

/** Reads robots.txt Sitemap: lines and /sitemap.xml (including nested indexes) on the same host. */
async function sitemapUrls(origin: URL, cap: number) {
  const robots = await text(new URL('/robots.txt', origin));
  const queue = [...new Set([...(robots?.match(/^sitemap:\s*(\S+)/gim)?.map(l => l.split(/:\s*/i).slice(1).join(':').trim()) ?? []), new URL('/sitemap.xml', origin).toString()])];
  const urls = new Set<string>(); let fetched = 0;
  while (queue.length && fetched < 8 && urls.size < cap * 4) {
    let u: URL; try { u = new URL(queue.shift()!); } catch { continue; } if (u.hostname !== origin.hostname) continue;
    const xml = await text(u); fetched++; if (!xml) continue;
    const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map(m => m[1].replace(/&amp;/g, '&'));
    if (/<sitemapindex/i.test(xml)) queue.push(...locs); else locs.forEach(l => { try { if (new URL(l).hostname === origin.hostname) urls.add(l); } catch {} });
  }
  return [...urls];
}

function analyze(url: string, html: string, status: number, ms: number): PageReport {
  const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ');
  const title = strip(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ''), description = meta(html, 'description');
  const h1 = [...body.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => strip(m[1])).filter(Boolean);
  const words = strip(body.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? body).split(/\s+/).filter(Boolean).length;
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i)?.[0].match(/href=["']([^"']+)/i)?.[1] ?? '';
  const noindex = /noindex/i.test(meta(html, 'robots')); const hasSchema = /application\/ld\+json/i.test(html); const ogImage = !!meta(html, 'og:image');
  const imagesNoAlt = [...body.matchAll(/<img\b[^>]*>/gi)].filter(m => !/\balt=["'][^"']+["']/i.test(m[0])).length;
  const issues: PageIssue[] = []; const add = (code: string, severity: PageIssue['severity'], message: string) => issues.push({ code, severity, message });
  if (status >= 400) add('http', 'high', `Returns HTTP ${status}`);
  if (!title) add('title-missing', 'high', 'Missing <title>'); else if (title.length > 60) add('title-long', 'low', `Title is ${title.length} chars (aim ≤60)`); else if (title.length < 20) add('title-short', 'medium', `Title is only ${title.length} chars`);
  if (!description) add('desc-missing', 'medium', 'Missing meta description'); else if (description.length > 160) add('desc-long', 'low', `Meta description is ${description.length} chars`);
  if (!h1.length) add('h1-missing', 'medium', 'No H1'); else if (h1.length > 1) add('h1-multi', 'low', `${h1.length} H1 tags`);
  if (words < 150 && status < 400) add('thin', 'medium', `Thin or client-rendered content (${words} words in HTML)`);
  if (!canonical) add('canonical', 'low', 'No canonical link');
  if (noindex) add('noindex', 'high', 'Page is set to noindex');
  if (!hasSchema) add('schema', 'low', 'No JSON-LD structured data');
  if (!ogImage) add('og-image', 'low', 'No og:image for social previews');
  if (imagesNoAlt) add('alt', 'low', `${imagesNoAlt} image(s) without alt text`);
  if (ms > 1500) add('slow', 'medium', `Slow response (${ms} ms)`);
  return { url, status, ms, title, description, h1, words, canonical, noindex, hasSchema, ogImage, imagesNoAlt, issues };
}

export async function crawlSite(raw: string, maxPages = 25): Promise<CrawlReport> {
  const cap = Math.min(50, Math.max(1, maxPages)); const start = normalizeUrl(raw); const origin = new URL(start.origin);
  const fromMap = await sitemapUrls(origin, cap);
  const seen = new Set<string>(); const queue: string[] = fromMap.length ? [start.toString(), ...fromMap] : [start.toString()];
  const pages: PageReport[] = [];
  while (queue.length && pages.length < cap) {
    const batch: string[] = [];
    while (queue.length && batch.length < 5 && pages.length + batch.length < cap) { const u = queue.shift()!.split('#')[0]; if (!seen.has(u)) { seen.add(u); batch.push(u); } }
    const done = await Promise.all(batch.map(async u => {
      try { const { res, ms, url } = await safeFetch(new URL(u), 10000); const ct = res.headers.get('content-type') ?? ''; if (!ct.includes('html')) return null;
        const html = (await res.text()).slice(0, 3_000_000);
        if (!fromMap.length) for (const m of html.matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi)) { try { const l = new URL(m[1], url); if (l.hostname === origin.hostname && !/\.(png|jpe?g|gif|svg|pdf|zip|webp|css|js)$/i.test(l.pathname)) queue.push(l.origin + l.pathname); } catch {} }
        return analyze(url.toString(), html, res.status, ms);
      } catch (e) { return { ...analyze(u, '', 0, 0), issues: [{ code: 'fetch', severity: 'high' as const, message: `Could not fetch: ${e instanceof Error ? e.message : e}` }] }; }
    }));
    pages.push(...done.filter((x): x is PageReport => !!x));
  }
  const siteIssues: PageIssue[] = [];
  const dup = (key: 'title' | 'description', label: string) => { const m = new Map<string, number>(); pages.forEach(p => p[key] && m.set(p[key], (m.get(p[key]) ?? 0) + 1)); const d = [...m].filter(([, n]) => n > 1); if (d.length) siteIssues.push({ code: `dup-${key}`, severity: 'medium', message: `${d.reduce((a, [, n]) => a + n, 0)} pages share ${d.length} duplicate ${label}(s)` }); };
  dup('title', 'title'); dup('description', 'meta description');
  if (!fromMap.length) siteIssues.push({ code: 'no-sitemap', severity: 'medium', message: 'No sitemap found via robots.txt or /sitemap.xml; pages were discovered by following links' });
  const llms = await text(new URL('/llms.txt', origin)); if (!llms || /<html/i.test(llms)) siteIssues.push({ code: 'no-llms', severity: 'low', message: 'No /llms.txt for AI assistants' });
  const w = { high: 3, medium: 1.5, low: 0.5 }; const penalty = pages.reduce((a, p) => a + p.issues.reduce((b, i) => b + w[i.severity], 0), 0) / Math.max(1, pages.length) + siteIssues.reduce((a, i) => a + w[i.severity], 0);
  return { origin: origin.toString(), discoveredBy: fromMap.length ? 'sitemap' : 'links', sitemapUrls: fromMap.length, pages, siteIssues, score: Math.max(0, Math.round(100 - penalty * 6)), capped: queue.length > 0, at: new Date().toISOString() };
}
