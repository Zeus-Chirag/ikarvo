import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { appUrl, envValue } from '@/lib/env';
import { notConfigured } from '@/lib/http';
export async function GET(req: Request) {
  const id = envValue('GITHUB_CLIENT_ID');
  if (!id || !envValue('GITHUB_CLIENT_SECRET') || !envValue('SESSION_SECRET')) return notConfigured('GitHub', ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'SESSION_SECRET']);
  const state = randomBytes(16).toString('hex');
  const u = new URL('https://github.com/login/oauth/authorize');
  u.searchParams.set('client_id', id); u.searchParams.set('scope', 'repo'); u.searchParams.set('state', state);
  u.searchParams.set('redirect_uri', `${appUrl(new URL(req.url).origin)}/api/github/callback`);
  const res = NextResponse.redirect(u);
  res.cookies.set('kx_gh_state', state, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600, secure: process.env.NODE_ENV === 'production' });
  return res;
}
