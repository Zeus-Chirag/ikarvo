import { NextResponse } from 'next/server';
import { requireActor } from '@/lib/auth';
import { fail, readJson, str } from '@/lib/http';
import { CMS, NotConfigured } from '@/lib/publishers';
export const runtime = 'nodejs';
// All CMS targets create DRAFTS for human review.
export async function POST(req: Request, { params }: { params: Promise<{ target: string }> }) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  const p = CMS[(await params).target]; if (!p) return fail(404, 'Unknown publishing target.');
  const b = await readJson(req); const title = str(b?.title, 300), markdown = str(b?.markdown, 200000);
  if (!title || !markdown) return fail(400, 'Article needs a title and body.');
  try { return NextResponse.json(await p.publish({ title, markdown, slug: str(b?.slug, 120) || undefined, excerpt: str(b?.excerpt, 300) || undefined })); }
  catch (e) { return e instanceof NotConfigured ? fail(503, e.message, e.keys) : fail(502, e instanceof Error ? e.message : String(e)); }
}
