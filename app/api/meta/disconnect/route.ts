import { NextResponse } from 'next/server';
import { requireActor } from '@/lib/auth';
import { deleteConn, graph, loadConn, metaFail } from '@/lib/meta';
export const runtime = 'nodejs';
/** Revokes the grant at Meta (DELETE /me/permissions) and removes the stored token. */
export async function POST() {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  try {
    const c = await loadConn(actor); let revoked = false;
    if (c?.source === 'oauth') { revoked = await graph<{ success?: boolean }>(c.token, 'me/permissions', { method: 'DELETE' }).then(d => !!d.success, () => false); await deleteConn(actor); }
    return NextResponse.json({ ok: true, revoked });
  } catch (e) { return metaFail(e); }
}
