import { NextResponse } from 'next/server';
import { requireActor } from '@/lib/auth';
import { getJob } from '@/lib/media';
import { fail } from '@/lib/http';
export const runtime = 'nodejs';
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  try { return NextResponse.json(await getJob(decodeURIComponent((await params).id))); }
  catch (e) { const m = e instanceof Error ? e.message : 'Could not read job.'; return fail(/Invalid job id|Unknown provider/.test(m) ? 400 : 502, m); }
}
