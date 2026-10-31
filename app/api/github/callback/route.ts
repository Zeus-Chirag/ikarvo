import { NextResponse, type NextRequest } from 'next/server';
import { appUrl, envValue } from '@/lib/env';
import { seal, cookieOpts } from '@/lib/seal';
export async function GET(req: NextRequest) {
  const base = appUrl(req.nextUrl.origin);
  const back = (q: string) => NextResponse.redirect(`${base}/app?view=integrations&${q}`);
  const err = req.nextUrl.searchParams.get('error'); if (err) return back(`error=github_${encodeURIComponent(err)}`); // access_denied, redirect_uri_mismatch
  const code = req.nextUrl.searchParams.get('code'); const state = req.nextUrl.searchParams.get('state');
  if (!code || !state || state !== req.cookies.get('kx_gh_state')?.value) return back('error=github_state');
  const tok = await fetch('https://github.com/login/oauth/access_token', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: envValue('GITHUB_CLIENT_ID'), client_secret: envValue('GITHUB_CLIENT_SECRET'), code, redirect_uri: `${base}/api/github/callback` }) }).then(r => r.json()).catch(() => null);
  if (!tok?.access_token) return back(`error=github_token${tok?.error ? `_${encodeURIComponent(tok.error)}` : ''}`);
  const me = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${tok.access_token}`, 'User-Agent': 'ikarvo' } }).then(r => r.json()).catch(() => null);
  const res = back('connected=github');
  res.cookies.set('kx_gh', seal({ token: tok.access_token, login: me?.login ?? '' }), cookieOpts);
  res.cookies.delete('kx_gh_state');
  return res;
}
