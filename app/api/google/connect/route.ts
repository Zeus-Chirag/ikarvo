import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { appUrl, envValue } from '@/lib/env';
import { notConfigured } from '@/lib/http';
import { GOOGLE_SCOPES, YOUTUBE_SCOPE, googleKeys } from '@/lib/google';
export async function GET(req: Request) {
  if (googleKeys.some(k => !envValue(k))) return notConfigured('Google Search Console / GA4', googleKeys);
  const state = randomBytes(16).toString('hex'); const u = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  Object.entries({ client_id: envValue('GOOGLE_CLIENT_ID'), redirect_uri: `${appUrl(new URL(req.url).origin)}/api/google/callback`, response_type: 'code', scope: [...GOOGLE_SCOPES, ...(new URL(req.url).searchParams.get('youtube') === '1' ? [YOUTUBE_SCOPE] : [])].join(' '), access_type: 'offline', include_granted_scopes: 'true', prompt: 'consent', state }).forEach(([k, val]) => u.searchParams.set(k, val));
  const res = NextResponse.redirect(u); res.cookies.set('kx_gg_back', new URL(req.url).searchParams.get('back') === 'integrations' ? 'integrations' : 'analytics', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600 }); res.cookies.set('kx_gg_state', state, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600, secure: process.env.NODE_ENV === 'production' }); return res;
}
