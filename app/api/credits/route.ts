import { NextResponse } from 'next/server';
import { requireActor } from '@/lib/auth';
import { usage } from '@/lib/credits';
import { fail } from '@/lib/http';
import { plans } from '@/lib/plans';
export const dynamic = 'force-dynamic';
export async function GET() {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  try { const u = await usage(actor); return NextResponse.json({ ...u, planName: plans().plans.find(p => p.id === u.plan)?.name ?? u.plan }); } catch (e) { return fail(503, e instanceof Error ? e.message : String(e)); }
}
