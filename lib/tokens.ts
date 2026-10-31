import 'server-only';
import { createHmac, randomBytes } from 'node:crypto';
import { envValue as v } from '@/lib/env';

/** TikTok user tokens last 24h. With TIKTOK_CLIENT_KEY/SECRET + TIKTOK_REFRESH_TOKEN (365 days) we mint a fresh one per call. */
let tt: { token: string; exp: number } | null = null;
export async function tiktokToken(): Promise<string> {
  if (v('TIKTOK_REFRESH_TOKEN') && v('TIKTOK_CLIENT_KEY') && v('TIKTOK_CLIENT_SECRET')) {
    if (tt && tt.exp > Date.now() + 60_000) return tt.token;
    const r = await fetch('https://open.tiktokapis.com/v2/oauth/token/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_key: v('TIKTOK_CLIENT_KEY'), client_secret: v('TIKTOK_CLIENT_SECRET'), grant_type: 'refresh_token', refresh_token: v('TIKTOK_REFRESH_TOKEN') }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.access_token) throw new Error(`TikTok token refresh failed: ${d.error_description ?? d.error ?? r.status}`);
    tt = { token: d.access_token, exp: Date.now() + (Number(d.expires_in) || 3600) * 1000 }; return tt.token;
  }
  if (v('TIKTOK_ACCESS_TOKEN')) return v('TIKTOK_ACCESS_TOKEN');
  throw new Error('TikTok is not configured.');
}
/** Required env keys for TikTok: refresh-token mode (recommended) or a raw 24h access token. */
export const tiktokKeys = () => (!v('TIKTOK_REFRESH_TOKEN') && v('TIKTOK_ACCESS_TOKEN') ? ['TIKTOK_ACCESS_TOKEN'] : ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET', 'TIKTOK_REFRESH_TOKEN']);

/** X: OAuth 1.0a user-context keys never expire (preferred for a server-side publisher). OAuth 2.0 user tokens expire after 2 hours. */
const pct = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
export function xAuthHeader(method: string, url: string): string {
  if (v('X_API_KEY') && v('X_API_SECRET') && v('X_ACCESS_TOKEN') && v('X_ACCESS_SECRET')) {
    const o: Record<string, string> = { oauth_consumer_key: v('X_API_KEY'), oauth_nonce: randomBytes(16).toString('hex'), oauth_signature_method: 'HMAC-SHA1', oauth_timestamp: String(Math.floor(Date.now() / 1000)), oauth_token: v('X_ACCESS_TOKEN'), oauth_version: '1.0' };
    const u = new URL(url); const params = { ...o, ...Object.fromEntries(u.searchParams) }; // JSON bodies are not part of the signature
    const base = [method.toUpperCase(), pct(`${u.origin}${u.pathname}`), pct(Object.keys(params).sort().map(k => `${pct(k)}=${pct(params[k])}`).join('&'))].join('&');
    o.oauth_signature = createHmac('sha1', `${pct(v('X_API_SECRET'))}&${pct(v('X_ACCESS_SECRET'))}`).update(base).digest('base64');
    return 'OAuth ' + Object.keys(o).sort().map(k => `${pct(k)}="${pct(o[k])}"`).join(', ');
  }
  return `Bearer ${v('X_ACCESS_TOKEN')}`;
}
export const xMode = () => (v('X_API_KEY') && v('X_API_SECRET') && v('X_ACCESS_TOKEN') && v('X_ACCESS_SECRET') ? 'oauth1' : v('X_ACCESS_TOKEN') ? 'oauth2' : null);
