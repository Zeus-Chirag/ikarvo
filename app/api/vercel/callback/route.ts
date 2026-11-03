import { saveConn } from '@/lib/conn';
import { NextResponse, type NextRequest } from 'next/server';
import { appUrl, envValue } from '@/lib/env';
import { seal, cookieOpts } from '@/lib/seal';
export async function GET(req: NextRequest) {
  const base = appUrl(req.nextUrl.origin);
  const back = (q: string) => NextResponse.redirect(`${base}/app?view=integrations&${q}`);
  const err = req.nextUrl.searchParams.get('error'); if (err) return back(`error=vercel_${encodeURIComponent(err)}`);
  const code = req.nextUrl.searchParams.get('code'); const state = req.nextUrl.searchParams.get('state');
  if (!code || (state && state !== req.cookies.get('kx_vc_state')?.value)) return back('error=vercel_state');
  const body = new URLSearchParams({ client_id: envValue('VERCEL_CLIENT_ID'), client_secret: envValue('VERCEL_CLIENT_SECRET'), code, redirect_uri: `${base}/api/vercel/callback` });
  const tok = await fetch('https://api.vercel.com/v2/oauth/access_token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }).then(r => r.json()).catch(() => null);
  if (!tok?.access_token) return back(`error=vercel_token${tok?.error ? `_${encodeURIComponent(tok.error)}` : ''}`);
  const res = back('connected=vercel');
  const sealed = seal({ token: tok.access_token, teamId: tok.team_id ?? null, source: 'oauth' });
  res.cookies.set('kx_vc', sealed, cookieOpts); await saveConn('kx_vc', sealed, tok.team_id ?? 'personal');
  res.cookies.delete('kx_vc_state');
  return res;
}
