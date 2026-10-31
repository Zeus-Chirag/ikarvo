import 'server-only';
import { cookies } from 'next/headers';
import { envValue as v } from '@/lib/env';
import { unseal } from '@/lib/seal';
export const GOOGLE_SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly', 'https://www.googleapis.com/auth/analytics.readonly'];
export const YOUTUBE_SCOPE = 'https://www.googleapis.com/auth/youtube.upload';
export const googleKeys = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'SESSION_SECRET'];
/** Exchanges the sealed refresh token for a short-lived access token. */
export async function googleAccess(): Promise<string | null> {
  const s = unseal<{ refresh: string }>((await cookies()).get('kx_gg')?.value); if (!s?.refresh) return null;
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ client_id: v('GOOGLE_CLIENT_ID'), client_secret: v('GOOGLE_CLIENT_SECRET'), refresh_token: s.refresh, grant_type: 'refresh_token' }) });
  const d = await r.json().catch(() => ({}));
  // invalid_grant = the user revoked access or the refresh token expired (7 days for apps in "Testing"). Treat as disconnected.
  if (d.error === 'invalid_grant') { try { (await cookies()).delete('kx_gg'); } catch { /* read-only context */ } return null; }
  if (!r.ok) throw new Error(`Google token refresh failed: ${d.error_description ?? d.error ?? r.status}`);
  return d.access_token ?? null;
}
/** Scopes the user granted at connect time (stored alongside the refresh token). */
export async function googleScopes(): Promise<string[]> {
  const s = unseal<{ scope?: string }>((await cookies()).get('kx_gg')?.value); return (s?.scope ?? GOOGLE_SCOPES.join(' ')).split(' ');
}
