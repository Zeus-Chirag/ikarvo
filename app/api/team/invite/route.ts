import { NextResponse } from 'next/server';
import { requireActor } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { appUrl, requestOrigin } from '@/lib/env';
import { fail, readJson, str } from '@/lib/http';
/**
 * Invite a teammate into your workspace. Records the membership (workspace_members), then sends a Supabase invite
 * email. When the invitee signs in with that address the membership activates and RLS gives them your shared
 * documents (viewers read-only). Existing users get no email from Supabase, so we tell the inviter.
 */
export async function POST(req: Request) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  if (actor.preview) return fail(400, 'Team invites need a real account (sign in with Supabase).');
  const b = await readJson(req); const email = str(b?.email, 200).toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail(400, 'Enter a valid email.');
  if (email === actor.email?.toLowerCase()) return fail(400, 'That is you.');
  const role = ['admin', 'editor', 'viewer'].includes(String(b?.role)) ? String(b?.role) : 'editor';
  const db = adminClient(); if (!db) return fail(503, 'Invites need the service role key on the server.', ['SUPABASE_SERVICE_ROLE_KEY']);
  const { error: me } = await db.from('workspace_members').upsert({ owner_id: actor.id, email, role, status: 'invited', member_id: null }, { onConflict: 'owner_id,email' });
  if (me) return fail(503, `Could not record the invite: ${me.message}. Has the shared-workspaces migration been applied?`);
  const { error } = await db.auth.admin.inviteUserByEmail(email, { data: { invited_by: actor.id, role }, redirectTo: `${appUrl(requestOrigin(req))}/app` });
  if (error && !/already/i.test(error.message)) return fail(502, error.message);
  return NextResponse.json({ ok: true, email, role, existing: !!error, note: error ? `${email} already has an account, so no email was sent. Your workspace appears in their switcher next time they open Ikarvo.` : `Invite email sent to ${email}.` });
}
