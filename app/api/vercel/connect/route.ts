import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { envValue } from '@/lib/env';
import { notConfigured } from '@/lib/http';
// Vercel OAuth runs through an Integration: https://vercel.com/docs/integrations
export async function GET() {
  const keys = ['VERCEL_CLIENT_ID', 'VERCEL_CLIENT_SECRET', 'VERCEL_INTEGRATION_SLUG', 'SESSION_SECRET'];
  if (keys.some(k => !envValue(k))) return notConfigured('Vercel OAuth', keys);
  const state = randomBytes(16).toString('hex');
  const res = NextResponse.redirect(`https://vercel.com/integrations/${envValue('VERCEL_INTEGRATION_SLUG')}/new?state=${state}`);
  res.cookies.set('kx_vc_state', state, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600, secure: process.env.NODE_ENV === 'production' });
  return res;
}
