import 'server-only';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/** Blocks loopback, private, link-local and metadata ranges (basic SSRF guard). */
function privateIp(ip: string): boolean {
  if (isIP(ip) === 6) { const l = ip.toLowerCase(); return l === '::1' || l.startsWith('fc') || l.startsWith('fd') || l.startsWith('fe80') || l.startsWith('::ffff:') && privateIp(l.slice(7)); }
  const [a, b] = ip.split('.').map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}
export function normalizeUrl(raw: string) {
  const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('Only http(s) URLs are allowed.');
  return u;
}
export async function safeFetch(url: URL, timeoutMs = 12000, redirects = 3, init?: { method?: string; body?: string; headers?: Record<string, string> }): Promise<{ res: Response; url: URL; ms: number }> {
  const { address } = await lookup(url.hostname);
  if (privateIp(address)) throw new Error('That address points to a private network and cannot be analyzed.');
  const t0 = Date.now();
  const res = await fetch(url, { redirect: 'manual', method: init?.method ?? 'GET', body: init?.body, signal: AbortSignal.timeout(timeoutMs), headers: { 'User-Agent': 'Ikarvo-SiteAudit/1.0 (+https://ikarvo.app)', Accept: 'text/html,*/*', ...init?.headers } });
  if (res.status >= 300 && res.status < 400 && res.headers.get('location') && redirects > 0) return safeFetch(new URL(res.headers.get('location')!, url), timeoutMs, redirects - 1, init?.method && init.method !== 'GET' ? undefined : init);
  return { res, url, ms: Date.now() - t0 };
}

const strip = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const all = (html: string, re: RegExp) => [...html.matchAll(re)].map(m => strip(m[1])).filter(Boolean);
const meta = (html: string, key: string) => html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${key}["'][^>]*>`, 'i'))?.[0].match(/content=["']([^"']*)["']/i)?.[1]?.trim() ?? '';

export type Check = { id: string; label: string; status: 'pass' | 'warn' | 'fail'; detail: string };
export type Audit = { url: string; status: number; ms: number; page: { title: string; description: string; h1: string[]; h2: string[]; text: string; wordCount: number; internalLinks: string[] }; checks: Check[]; score: number };

export async function auditSite(raw: string): Promise<Audit> {
  const u = normalizeUrl(raw);
  const { res, url, ms } = await safeFetch(u);
  const html = (await res.text()).slice(0, 2_000_000);
  const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, ' ');
  const title = strip(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
  const description = meta(html, 'description');
  const h1 = all(body, /<h1[^>]*>([\s\S]*?)<\/h1>/gi), h2 = all(body, /<h2[^>]*>([\s\S]*?)<\/h2>/gi).slice(0, 20);
  const text = strip(body.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? body);
  const words = text.split(/\s+/).filter(Boolean).length;
  const imgs = [...body.matchAll(/<img\b[^>]*>/gi)].map(m => m[0]); const noAlt = imgs.filter(i => !/\balt=["'][^"']+["']/i.test(i)).length;
  const links = [...new Set([...body.matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi)].map(m => { try { return new URL(m[1], url); } catch { return null; } }).filter((x): x is URL => !!x && x.hostname === url.hostname).map(x => x.pathname))].slice(0, 60);
  const side = async (p: string) => { try { const r = await safeFetch(new URL(p, url), 6000); return r.res.ok ? (await r.res.text()).slice(0, 20000) : null; } catch { return null; } };
  const [robots, sitemap, llms] = await Promise.all([side('/robots.txt'), side('/sitemap.xml'), side('/llms.txt')]);
  const blocksAi = robots ? /user-agent:\s*(gptbot|claudebot|perplexitybot|google-extended)[\s\S]*?disallow:\s*\/\s*$/im.test(robots) : false;
  const c = (id: string, label: string, ok: boolean, warn: boolean, detail: string): Check => ({ id, label, status: ok ? 'pass' : warn ? 'warn' : 'fail', detail });
  const checks: Check[] = [
    c('status', 'Page responds', res.ok, false, `HTTP ${res.status}`),
    c('https', 'Served over HTTPS', url.protocol === 'https:', false, url.protocol),
    c('speed', 'Server response time', ms < 800, ms < 2000, `${ms} ms to first response`),
    c('title', 'Title tag (30–60 chars)', title.length >= 30 && title.length <= 60, title.length > 0, title ? `${title.length} chars: “${title}”` : 'Missing'),
    c('desc', 'Meta description (70–160 chars)', description.length >= 70 && description.length <= 160, description.length > 0, description ? `${description.length} chars` : 'Missing'),
    c('h1', 'Exactly one H1', h1.length === 1, h1.length > 1, h1.length ? `${h1.length} found: “${h1[0]}”` : 'No H1'),
    c('words', 'Enough indexable text (300+ words)', words >= 300, words >= 120, `${words} words in server HTML${words < 120 ? '. Content may be client-rendered, which crawlers and AI bots often miss' : ''}`),
    c('alt', 'Images have alt text', noAlt === 0, noAlt <= 2, `${imgs.length - noAlt}/${imgs.length} images with alt`),
    c('canonical', 'Canonical URL', /<link[^>]+rel=["']canonical["']/i.test(html), false, /<link[^>]+rel=["']canonical["']/i.test(html) ? 'Present' : 'Missing'),
    c('og', 'Open Graph tags (social previews)', !!meta(html, 'og:title') && !!meta(html, 'og:image'), !!meta(html, 'og:title'), `og:title ${meta(html, 'og:title') ? '✓' : '✗'} · og:image ${meta(html, 'og:image') ? '✓' : '✗'}`),
    c('lang', 'HTML lang attribute', /<html[^>]+lang=/i.test(html), false, /<html[^>]+lang=["']([^"']+)/i.exec(html)?.[1] ?? 'Missing'),
    c('viewport', 'Mobile viewport', /<meta[^>]+name=["']viewport["']/i.test(html), false, ''),
    c('schema', 'Structured data (JSON-LD)', /application\/ld\+json/i.test(html), false, /application\/ld\+json/i.test(html) ? 'Present' : 'None: add Organization/Product/FAQ schema'),
    c('robots', 'robots.txt', !!robots, false, robots ? 'Found' : 'Not found'),
    c('sitemap', 'sitemap.xml', !!sitemap && /<urlset|<sitemapindex/i.test(sitemap), false, sitemap ? 'Found' : 'Not found'),
    c('aibots', 'AI crawlers allowed', !blocksAi, false, blocksAi ? 'robots.txt blocks an AI crawler (GPTBot / ClaudeBot / PerplexityBot / Google-Extended)' : 'Not blocked'),
    c('llms', 'llms.txt for AI assistants', !!llms && !/<html/i.test(llms), true, llms && !/<html/i.test(llms) ? 'Found' : 'Optional: add /llms.txt summarizing your product'),
  ];
  const score = Math.round(checks.reduce((a, x) => a + (x.status === 'pass' ? 1 : x.status === 'warn' ? 0.5 : 0), 0) / checks.length * 100);
  return { url: url.toString(), status: res.status, ms, page: { title, description, h1, h2, text: text.slice(0, 12000), wordCount: words, internalLinks: links }, checks, score };
}
