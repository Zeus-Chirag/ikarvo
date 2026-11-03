import 'server-only';
import { envValue as v } from '@/lib/env';
export type Hit = { title: string; url: string; snippet: string };
/** Web search via Brave Search API or Serper (Google results). */
export async function webSearch(q: string, n = 10): Promise<Hit[]> {
  if (v('BRAVE_SEARCH_API_KEY')) {
    const r = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=${n}`, { headers: { 'X-Subscription-Token': v('BRAVE_SEARCH_API_KEY'), Accept: 'application/json' }, cache: 'no-store' });
    const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(`Brave Search ${r.status}: ${d?.error?.detail ?? ''}`);
    return (d.web?.results ?? []).map((x: { title: string; url: string; description: string }) => ({ title: x.title, url: x.url, snippet: x.description?.replace(/<[^>]+>/g, '') ?? '' }));
  }
  if (v('SERPER_API_KEY')) {
    // Serper's free tier rejects search operators (site:, inurl:, intitle: ...): send them as plain words and apply site: ourselves.
    const sites = [...q.matchAll(/(?:^|\s)-?site:(\S+)/gi)].map(m => m[1].toLowerCase().replace(/^www\./, ''));
    const plain = q.replace(/(?:^|\s)-?(site|inurl|intitle|intext|allintitle|filetype):(\S+)/gi, ' $2').replace(/\s+/g, ' ').trim();
    const ask = async (query: string) => { const r = await fetch('https://google.serper.dev/search', { method: 'POST', headers: { 'X-API-KEY': v('SERPER_API_KEY'), 'Content-Type': 'application/json' }, body: JSON.stringify({ q: query, num: Math.min(n, 10) }), signal: AbortSignal.timeout(15000) });
      const d = await r.json().catch(() => ({})); return { r, d }; };
    let { r, d } = await ask(q);
    if (!r.ok && /not allowed|pattern/i.test(String(d?.message))) ({ r, d } = await ask(plain));
    if (!r.ok) throw new Error(`Serper ${r.status}: ${d?.message ?? ''}`);
    const hits: Hit[] = (d.organic ?? []).map((x: { title: string; link: string; snippet: string }) => ({ title: x.title, url: x.link, snippet: x.snippet ?? '' }));
    const inc = sites.filter((_, i) => !/(?:^|\s)-site:/i.test([...q.matchAll(/(?:^|\s)-?site:\S+/gi)][i]?.[0] ?? ''));
    return inc.length ? hits.filter(h => { try { const host = new URL(h.url).hostname.toLowerCase(); return inc.some(s => { const dom = s.split('/')[0]; return host === dom || host.endsWith(`.${dom}`); }); } catch { return false; } }) : hits;
  }
  const errs: string[] = [];
  for (const f of [ddgHtml, braveHtml]) { try { const h = await f(q, n); if (h.length) return h; errs.push(`${f.name}: 0 results`); } catch (e) { errs.push(e instanceof Error ? e.message : String(e)); } }
  throw new Error(`Free web search is busy right now. Try again in a minute, or add BRAVE_SEARCH_API_KEY for reliable results. (${errs.join('; ').slice(0, 160)})`);
}
/** Free, keyless: DuckDuckGo's HTML results endpoint. */
async function ddgHtml(q: string, n: number): Promise<Hit[]> {
  const r = await fetch('https://html.duckduckgo.com/html/', { method: 'POST', body: new URLSearchParams({ q, kl: 'us-en' }), headers: { 'User-Agent': 'Mozilla/5.0', 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'text/html' }, cache: 'no-store', signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error(`ddg HTTP ${r.status}`);
  const html = await r.text();
  return html.split('class="result__a"').slice(1).map(b => { let url = ent(b.match(/href="([^"]+)"/)?.[1] ?? ''); const u = url.match(/uddg=([^&]+)/); if (u) url = decodeURIComponent(u[1]); if (url.startsWith('//')) url = `https:${url}`;
    return { url, title: ent(b.match(/>([\s\S]*?)<\/a>/)?.[1] ?? ''), snippet: ent(b.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? '') }; })
    .filter(h => /^https?:\/\//.test(h.url) && !/duckduckgo\.com\/y\.js/.test(h.url)).slice(0, n);
}
const ent = (s: string) => s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
/** Free, keyless fallback: Brave Search's public results page. */
async function braveHtml(q: string, n: number): Promise<Hit[]> {
  const r = await fetch(`https://search.brave.com/search?source=web&q=${encodeURIComponent(q)}`, { headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', 'Accept-Language': 'en-US,en;q=0.9', Accept: 'text/html' }, cache: 'no-store', signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error(`brave HTTP ${r.status}`);
  const html = await r.text();
  return html.split(/<div class="snippet [^"]*" data-pos="\d+" data-type="web"/).slice(1).map(b => ({ url: ent(b.match(/<a href="(https?:\/\/[^"]+)"/)?.[1] ?? ''), title: ent(b.match(/<div class="title[^"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? ''), snippet: ent(b.match(/<div class="content[^"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? '') }))
    .filter(h => h.url && h.title && !/^https?:\/\/([a-z]+\.)?brave\.com/.test(h.url)).slice(0, n);
}
/** Which engine webSearch will use (for labels). */
export const searchSource = () => v('BRAVE_SEARCH_API_KEY') ? 'brave' : v('SERPER_API_KEY') ? 'serper' : 'free-web';
