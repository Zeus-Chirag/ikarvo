import { NextResponse, type NextRequest } from 'next/server';
import { appUrl, envValue } from '@/lib/env';
import { requireActor } from '@/lib/auth';
import { META_REQUIRED_SCOPES, graph, graphUrl, saveConn, metaAppMissing } from '@/lib/meta';
export const runtime = 'nodejs';
/** Code → short-lived token → long-lived (~60 day) user token, checks granted scopes, stores it for this workspace. */
export async function GET(req: NextRequest) {
  const base = appUrl(req.nextUrl.origin);
  const back = (q: string) => { const r = NextResponse.redirect(`${base}/app?view=integrations&${q}`); r.cookies.delete('kx_meta_state'); return r; };
  if (metaAppMissing().length) return back(`error=meta_missing_${metaAppMissing().join('_')}`);
  const err = req.nextUrl.searchParams.get('error'); if (err) return back(`error=meta_${encodeURIComponent(req.nextUrl.searchParams.get('error_reason') || err)}`);
  const code = req.nextUrl.searchParams.get('code');
  if (!code || req.nextUrl.searchParams.get('state') !== req.cookies.get('kx_meta_state')?.value) return back('error=meta_state');
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  const q = (p: Record<string, string>) => fetch(`${graphUrl('oauth/access_token')}?${new URLSearchParams(p)}`, { cache: 'no-store' }).then(r => r.json()).catch(() => null);
  const id = envValue('META_APP_ID'), secret = envValue('META_APP_SECRET');
  const short = await q({ client_id: id, client_secret: secret, redirect_uri: `${base}/api/meta/callback`, code });
  if (!short?.access_token) return back(`error=meta_token${short?.error?.code ? `_${short.error.code}` : ''}`);
  const long = await q({ grant_type: 'fb_exchange_token', client_id: id, client_secret: secret, fb_exchange_token: short.access_token });
  const token: string = long?.access_token ?? short.access_token; const expiresIn = Number(long?.expires_in ?? short.expires_in ?? 0);
  try {
    const me = await graph<{ id: string; name: string }>(token, 'me', { params: { fields: 'id,name' } });
    const perms = await graph<{ data: { permission: string; status: string }[] }>(token, 'me/permissions');
    const granted = perms.data.filter(p => p.status === 'granted').map(p => p.permission);
    const missing = META_REQUIRED_SCOPES.filter(s => !granted.includes(s)); if (missing.length) return back(`error=meta_scopes_declined_${missing.join('_')}`);
    const res = back('connected=Meta%20Ads&meta=pick');
    await saveConn(actor, { token, expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null, scopes: granted, userId: me.id, userName: me.name, source: 'oauth' }, res);
    return res;
  } catch (e) { return back(`error=meta_${encodeURIComponent((e instanceof Error ? e.message : 'failed').slice(0, 80))}`); }
}
