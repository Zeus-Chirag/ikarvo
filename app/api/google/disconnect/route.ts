import { NextResponse, type NextRequest } from 'next/server';
import { unseal } from '@/lib/seal';
/** Revokes the refresh token at Google (so the grant disappears from the user's Google account), then clears the cookie. */
export async function POST(req: NextRequest) {
  const s = unseal<{ refresh: string }>(req.cookies.get('kx_gg')?.value);
  let revoked = false; if (s?.refresh) revoked = (await fetch('https://oauth2.googleapis.com/revoke', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: s.refresh }) }).catch(() => null))?.ok ?? false;
  const r = NextResponse.json({ ok: true, revoked }); r.cookies.delete('kx_gg'); return r;
}
