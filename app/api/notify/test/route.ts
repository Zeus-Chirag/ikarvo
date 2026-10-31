import { NextResponse } from 'next/server';
import { requireActor } from '@/lib/auth';
import { notify, NOTIFY, type NotifyChannel } from '@/lib/notify';
import { fail, readJson } from '@/lib/http';
export async function POST(req: Request) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  const b = await readJson(req); const c = String(b?.channel) as NotifyChannel; if (!(c in NOTIFY)) return fail(400, 'Unknown channel.');
  try { return NextResponse.json(await notify(c, 'Ikarvo: test message. Daily digests will arrive here.')); }
  catch (e) { const k = (e as { keys?: string[] }).keys; return k ? fail(503, (e as Error).message, k) : fail(502, (e as Error).message); }
}
