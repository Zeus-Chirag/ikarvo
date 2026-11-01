import { NextResponse, type NextRequest } from 'next/server';
import { appUrl, callbackUrl, envValue, requestOrigin } from '@/lib/env';
import { seal, cookieOpts } from '@/lib/seal';
export async function GET(req: NextRequest) {
  const base = appUrl(requestOrigin(req)); const toInteg = req.cookies.get('kx_gg_back')?.value === 'integrations';
  const back = (q: string) => { const r = NextResponse.redirect(`${base}/app?${toInteg ? 'view=integrations' : 'view=marketing&tab=analytics'}&${q}`); r.cookies.delete('kx_gg_state'); r.cookies.delete('kx_gg_back'); return r; };
  const err = req.nextUrl.searchParams.get('error');
  if (err) {
    // redirect_uri_mismatch: the OAuth client does not list this exact authorized redirect URI.
    const hint = /uri/i.test(err) ? callbackUrl(req, 'google') : '';
    return back(`error=google_${encodeURIComponent(err)}${hint ? `&hint=${encodeURIComponent(hint)}` : ''}`); // e.g. access_denied
  }
  const code = req.nextUrl.searchParams.get('code'); if (!code || req.nextUrl.searchParams.get('state') !== req.cookies.get('kx_gg_state')?.value) return back('error=google_state');
  const t = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ code, client_id: envValue('GOOGLE_CLIENT_ID'), client_secret: envValue('GOOGLE_CLIENT_SECRET'), redirect_uri: `${base}/api/google/callback`, grant_type: 'authorization_code' }) }).then(r => r.json()).catch(() => null);
  if (!t?.refresh_token) return back(`error=google_token${t?.error ? `_${encodeURIComponent(t.error)}` : ''}`);
  const res = back('connected=google'); res.cookies.set('kx_gg', seal({ refresh: t.refresh_token, scope: t.scope ?? '' }), cookieOpts); return res;
}
