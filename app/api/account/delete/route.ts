import { NextResponse } from 'next/server';
import { requireActor } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { fail, readJson } from '@/lib/http';
/** Permanently deletes the signed-in account (cascades all rows). Requires typing DELETE. */
export async function POST(req: Request) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  if (actor.preview) return fail(400, 'Preview mode has no account. Clear this browser\'s site data to remove preview data.');
  const b = await readJson(req); if (b?.confirm !== 'DELETE') return fail(400, 'Type DELETE to confirm.');
  const db = adminClient(); if (!db) return fail(503, 'Account deletion needs the service role key on the server.', ['SUPABASE_SERVICE_ROLE_KEY']);
  const { error } = await db.auth.admin.deleteUser(actor.id); if (error) return fail(502, error.message);
  await actor.supabase?.auth.signOut(); return NextResponse.json({ ok: true });
}
