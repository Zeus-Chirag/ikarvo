import 'server-only';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { isPreviewMode } from '@/lib/env';

/**
 * Per-user OAuth token store. The sealed (AES-256-GCM) token lives in the user's own
 * `user_connections` row (RLS: owner only) so it follows them across browsers and devices,
 * with the httpOnly cookie kept as a fast local cache.
 */
const PROVIDER: Record<string, 'github' | 'vercel' | 'google'> = { kx_gh: 'github', kx_vc: 'vercel', kx_gg: 'google' };

async function db() {
  if (isPreviewMode()) return null;
  try { const sb = await createClient(); const { data: { user } } = await sb.auth.getUser(); return user ? { sb, uid: user.id } : null; } catch { return null; }
}

/** Sealed value for this user: cookie first, then their database row. */
export async function connValue(cookie: string): Promise<string | undefined> {
  const c = (await cookies()).get(cookie)?.value; if (c) return c;
  const p = PROVIDER[cookie]; const d = p && await db(); if (!d) return undefined;
  const { data } = await d.sb.from('user_connections').select('sealed').eq('provider', p).maybeSingle();
  return (data as { sealed?: string } | null)?.sealed ?? undefined;
}

export async function saveConn(cookie: string, sealed: string, label?: string) {
  const p = PROVIDER[cookie]; const d = p && await db(); if (!d) return;
  await d.sb.from('user_connections').upsert({ user_id: d.uid, provider: p, sealed, account_label: label ?? null, updated_at: new Date().toISOString() });
}

export async function dropConn(cookie: string) {
  try { (await cookies()).delete(cookie); } catch { /* read-only context */ }
  const p = PROVIDER[cookie]; const d = p && await db(); if (!d) return;
  await d.sb.from('user_connections').delete().eq('provider', p);
}
