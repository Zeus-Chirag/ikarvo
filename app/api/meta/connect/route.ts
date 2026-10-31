import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { appUrl, envValue } from '@/lib/env';
import { requireActor } from '@/lib/auth';
import { META_SCOPES, GV, metaAppMissing, metaUnconfigured, oauthBase } from '@/lib/meta';
export const runtime = 'nodejs';
/** Starts Facebook Login for Business / Marketing API OAuth. */
export async function GET(req: Request) {
  const miss = metaAppMissing(); if (miss.length) return metaUnconfigured(miss);
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  const state = randomBytes(16).toString('hex'); const u = new URL(`${oauthBase()}/${GV()}/dialog/oauth`);
  const p: Record<string, string> = { client_id: envValue('META_APP_ID'), redirect_uri: `${appUrl(new URL(req.url).origin)}/api/meta/callback`, state, response_type: 'code', scope: META_SCOPES.join(',') };
  if (envValue('META_LOGIN_CONFIG_ID')) { delete p.scope; p.config_id = envValue('META_LOGIN_CONFIG_ID'); } // Facebook Login for Business configuration
  Object.entries(p).forEach(([k, val]) => u.searchParams.set(k, val));
  const res = NextResponse.redirect(u); res.cookies.set('kx_meta_state', state, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600, secure: process.env.NODE_ENV === 'production' }); return res;
}
