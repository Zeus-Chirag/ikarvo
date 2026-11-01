import { NextResponse, type NextRequest } from 'next/server';
import { appUrl, envValue, requestOrigin } from '@/lib/env';
import { seal, cookieOpts } from '@/lib/seal';
export async function GET(req: NextRequest) {
  const base = appUrl(requestOrigin(req));
  const back = (q: string) => NextResponse.redirect(`${base}/app?view=integrations&${q}`);
  const err = req.nextUrl.searchParams.get('error'); if (err) return back(`error=vercel_${encodeURIComponent(err)}`);
  const code = req.nextUrl.searchParams.get('code'); const state = req.nextUrl.searchParams.get('state');
  // Vercel always echoes `state` back. Requiring it to match the cookie stops someone binding
  // their own Vercel account to a victim's session (login CSRF).
  const expected = req.cookies.get('kx_vc_state')?.value;
  if (!code || !state || !expected || state !== expected) return back('error=vercel_state');
  const body = new URLSearchParams({ client_id: envValue('VERCEL_CLIENT_ID'), client_secret: envValue('VERCEL_CLIENT_SECRET'), code, redirect_uri: `${base}/api/vercel/callback` });
  const tok = await fetch('https://api.vercel.com/v2/oauth/access_token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }).then(r => r.json()).catch(() => null);
  if (!tok?.access_token) return back(`error=vercel_token${tok?.error ? `_${encodeURIComponent(tok.error)}` : ''}`);
  const res = back('connected=vercel');
  // teamId arrives on the callback query for team installs; the token response is the fallback.
  const teamId = req.nextUrl.searchParams.get('teamId') ?? tok.team_id ?? null;
  res.cookies.set('kx_vc', seal({ token: tok.access_token, teamId, source: 'oauth' }), cookieOpts);
  res.cookies.delete('kx_vc_state');
  return res;
}
