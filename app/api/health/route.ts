import { NextResponse } from 'next/server';

/** Liveness probe: returns 200 when the process is up. No auth, no data. */
export function GET() {
  return NextResponse.json({ ok: true, ts: Date.now() });
}
