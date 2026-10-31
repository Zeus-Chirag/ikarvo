import { NextResponse } from 'next/server';
import { requireActor } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { fail } from '@/lib/http';
/**
 * GET: activates any pending invites addressed to the signed-in email, then returns
 * the caller's roster (people they invited) and the workspaces they can open.
 * DELETE ?email=: owner removes a member (RLS: owner delete).
 */
export async function GET() {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  if (!actor.supabase) return NextResponse.json({ me: actor.id, roster: [], workspaces: [] });
  const db = adminClient();
  if (db && actor.email) await db.from('workspace_members').update({ member_id: actor.id, status: 'active' }).eq('email', actor.email.toLowerCase()).eq('status', 'invited').neq('owner_id', actor.id);
  const { data, error } = await actor.supabase.from('workspace_members').select('owner_id,email,member_id,role,status,created_at');
  if (error) return fail(503, `Team data unavailable: ${error.message}. Has the shared-workspaces migration been applied?`);
  const roster = (data ?? []).filter(r => r.owner_id === actor.id);
  const mine = (data ?? []).filter(r => r.member_id === actor.id && r.owner_id !== actor.id && r.status === 'active');
  const workspaces = await Promise.all(mine.map(async r => { let ownerEmail = ''; if (db) { const u = await db.auth.admin.getUserById(r.owner_id); ownerEmail = u.data.user?.email ?? ''; } return { owner: r.owner_id, ownerEmail, role: r.role }; }));
  return NextResponse.json({ me: actor.id, roster, workspaces });
}
export async function DELETE(req: Request) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  if (!actor.supabase) return fail(400, 'Preview mode has no team.');
  const email = (new URL(req.url).searchParams.get('email') || '').toLowerCase();
  const { error } = await actor.supabase.from('workspace_members').delete().eq('owner_id', actor.id).eq('email', email);
  if (error) return fail(502, error.message);
  return NextResponse.json({ ok: true });
}
