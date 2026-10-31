import { NextResponse } from 'next/server';
import { requireActor } from '@/lib/auth';
import { fail, readJson, str } from '@/lib/http';
import { SOCIAL, NotConfigured } from '@/lib/publishers';
export const runtime = 'nodejs';
export async function POST(req: Request, { params }: { params: Promise<{ channel: string }> }) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  const p = SOCIAL[(await params).channel]; if (!p) return fail(404, 'Unknown channel.');
  const b = await readJson(req); const text = str(b?.text, 5000); if (!text) return fail(400, 'Nothing to post.');
  if (text.length > p.limit) return fail(400, `${p.label} allows ${p.limit} characters; this post has ${text.length}.`);
  try { return NextResponse.json(await p.publish({ text, mediaUrl: str(b?.mediaUrl, 1000) || undefined })); }
  catch (e) { return e instanceof NotConfigured ? fail(503, e.message, e.keys) : fail(502, e instanceof Error ? e.message : String(e)); }
}
