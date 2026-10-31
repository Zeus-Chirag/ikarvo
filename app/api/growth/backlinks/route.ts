import { NextResponse } from 'next/server';
import { requireActor } from '@/lib/auth';
import { fail, readJson, str } from '@/lib/http';
import { webSearch, type Hit } from '@/lib/search';
import { NotConfigured } from '@/lib/publishers';
export const runtime = 'nodejs';
export const maxDuration = 60;
// Finds link opportunities with footprint queries. Classification is rule-based and transparent.
export async function POST(req: Request) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  const b = await readJson(req); const topic = str(b?.topic, 120); if (topic.length < 3) return fail(400, 'Enter your topic or category.');
  const own = str(b?.domain, 200).replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const competitors = (Array.isArray(b?.competitors) ? b.competitors : []).map((c: unknown) => str(c, 60)).filter(Boolean).slice(0, 3);
  const plays: [string, string][] = [[`"${topic}" "write for us"`, 'Guest post'], [`"${topic}" intitle:resources`, 'Resource page'], [`best ${topic} tools`, 'Listicle'], [`${topic} "submit your tool" OR "submit a tool"`, 'Directory'],
    ...competitors.map(c => [`alternatives to ${c}`, 'Alternatives list'] as [string, string]), ...competitors.map(c => [`"${c}" review`, 'Review site'] as [string, string])];
  try {
    const seen = new Set<string>(); const out: (Hit & { play: string; domain: string; query: string })[] = [];
    for (const [q, play] of plays) for (const h of await webSearch(q, 8)) {
      const domain = new URL(h.url).hostname.replace(/^www\./, '');
      if (seen.has(domain) || (own && domain.endsWith(own)) || /(reddit|youtube|facebook|linkedin|x|twitter|quora|amazon|wikipedia)\.com$/.test(domain)) continue;
      seen.add(domain); out.push({ ...h, play, domain, query: q });
    }
    return NextResponse.json({ opportunities: out.slice(0, 60) });
  } catch (e) { return e instanceof NotConfigured ? fail(503, e.message, e.keys) : fail(502, e instanceof Error ? e.message : String(e)); }
}
