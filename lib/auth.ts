import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { isPreviewMode } from '@/lib/env';
import { fail } from '@/lib/http';
import { spend } from '@/lib/credits';
import type { NextResponse } from 'next/server';

export type Actor = { id: string; email?: string; preview: boolean; supabase: Awaited<ReturnType<typeof createClient>> | null };

/** Resolve the signed-in user, or the local preview actor. Returns a response on failure. */
export async function requireActor(): Promise<Actor | NextResponse> {
  if (isPreviewMode()) return { id: 'preview-user', email: 'preview@local', preview: true, supabase: null };
  let supabase;
  try { supabase = await createClient(); }
  catch { return fail(503, 'Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, or set PREVIEW_MODE=1 for local preview.', ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']); }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail(401, 'Please sign in to continue.');
  return { id: user.id, email: user.email, preview: false, supabase };
}

/** Atomic per-user hourly AI quota (Supabase RPC). Preview mode is unmetered. */
export async function consumeQuota(actor: Actor, limit = 30, action = 'ai'): Promise<NextResponse | null> {
  const c = await spend(actor, action); if (!c.ok) return fail(c.status, c.message);
  if (!actor.supabase) return null;
  const { data, error } = await actor.supabase.rpc('consume_ai_quota', { p_hourly_limit: limit });
  if (error) return fail(503, `Usage check failed: ${error.message}. Did you run the Supabase migrations?`);
  const row = Array.isArray(data) ? data[0] : null;
  if (!row?.allowed) return fail(429, `You've used all ${limit} AI requests for this hour. Try again after the reset.`);
  return null;
}
