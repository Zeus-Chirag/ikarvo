import { NextResponse } from 'next/server';
import { requireActor } from '@/lib/auth';
import { auditSite } from '@/lib/site';
import { fail, readJson, str } from '@/lib/http';
export const runtime = 'nodejs';
export const maxDuration = 60;
// Deterministic SEO + AI-readiness audit. Needs no API key.
export async function POST(req: Request) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  const b = await readJson(req); const url = str(b?.url, 500); if (!url) return fail(400, 'Enter a website URL.');
  try { return NextResponse.json(await auditSite(url)); }
  catch (e) { return fail(422, `Could not analyze that site: ${e instanceof Error ? e.message : e}`); }
}
