import { NextResponse } from 'next/server';
import { requireActor } from '@/lib/auth';
import { fail } from '@/lib/http';
import { AVATAR, avatarMissing, avatarStatus, type AvatarProvider } from '@/lib/avatar';
import { notConfigured } from '@/lib/http';
export const runtime = 'nodejs';
export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  const id = decodeURIComponent((await ctx.params).id); const p = id.split(':', 1)[0] as AvatarProvider;
  if (!AVATAR[p]) return fail(400, 'Invalid job id.');
  const miss = avatarMissing(p); if (miss.length) return notConfigured(AVATAR[p].label, miss);
  try { return NextResponse.json(await avatarStatus(id)); }
  catch (e) { return fail((e as { status?: number }).status ?? 502, e instanceof Error ? e.message : String(e)); }
}
