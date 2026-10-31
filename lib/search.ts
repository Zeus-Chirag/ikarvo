import 'server-only';
import { envValue as v } from '@/lib/env';
import { NotConfigured } from '@/lib/publishers';
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
  throw new NotConfigured(['BRAVE_SEARCH_API_KEY or SERPER_API_KEY'], 'Web search');
}
