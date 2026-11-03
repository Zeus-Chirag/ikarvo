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
    const r = await fetch('https://google.serper.dev/search', { method: 'POST', headers: { 'X-API-KEY': v('SERPER_API_KEY'), 'Content-Type': 'application/json' }, body: JSON.stringify({ q, num: n }) });
    const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(`Serper ${r.status}: ${d?.message ?? ''}`);
    return (d.organic ?? []).map((x: { title: string; link: string; snippet: string }) => ({ title: x.title, url: x.link, snippet: x.snippet ?? '' }));
  }
  return braveHtml(q, n);
}
const ent = (s: string) => s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
/** Free, keyless fallback: Brave Search's public results page. */
async function braveHtml(q: string, n: number): Promise<Hit[]> {
  const r = await fetch(`https://search.brave.com/search?source=web&q=${encodeURIComponent(q)}`, { headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36', 'Accept-Language': 'en-US,en;q=0.9', Accept: 'text/html' }, cache: 'no-store', signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error(`Web search is busy right now (HTTP ${r.status}). Try again in a minute, or add BRAVE_SEARCH_API_KEY.`);
  const html = await r.text();
  return html.split(/<div class="snippet [^"]*" data-pos="\d+" data-type="web"/).slice(1).map(b => ({ url: ent(b.match(/<a href="(https?:\/\/[^"]+)"/)?.[1] ?? ''), title: ent(b.match(/<div class="title[^"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? ''), snippet: ent(b.match(/<div class="content[^"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? '') }))
    .filter(h => h.url && h.title && !/^https?:\/\/([a-z]+\.)?brave\.com/.test(h.url)).slice(0, n);
}
/** Which engine webSearch will use (for labels). */
export const searchSource = () => v('BRAVE_SEARCH_API_KEY') ? 'brave' : v('SERPER_API_KEY') ? 'serper' : 'brave-web';
