import { NextResponse } from 'next/server';
import { requireActor } from '@/lib/auth';
import { crawlSite } from '@/lib/crawl';
import { fail, readJson, str } from '@/lib/http';
export const runtime = 'nodejs';
export const maxDuration = 120;
// Sitemap-driven, same-host, SSRF-guarded crawl, capped at 50 pages. No API key needed.
export async function POST(req: Request) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  const b = await readJson(req); const url = str(b?.url, 500); if (!url) return fail(400, 'Enter a website URL.');
  try { return NextResponse.json(await crawlSite(url, Number(b?.maxPages) || 25)); }
  catch (e) { return fail(422, `Crawl failed: ${e instanceof Error ? e.message : e}`); }
}
