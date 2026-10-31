import { NextResponse } from 'next/server';
import { githubSession } from '@/lib/integrations';
import { envValue } from '@/lib/env';
/** Revokes the OAuth grant at GitHub (DELETE /applications/{client_id}/grant), then clears the cookie. */
export async function POST() {
  const s = await githubSession().catch(() => null); let revoked = false;
  if (s?.token && envValue('GITHUB_CLIENT_ID') && envValue('GITHUB_CLIENT_SECRET')) {
    const r = await fetch(`https://api.github.com/applications/${envValue('GITHUB_CLIENT_ID')}/grant`, { method: 'DELETE', headers: { Authorization: `Basic ${Buffer.from(`${envValue('GITHUB_CLIENT_ID')}:${envValue('GITHUB_CLIENT_SECRET')}`).toString('base64')}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'ikarvo' }, body: JSON.stringify({ access_token: s.token }) }).catch(() => null);
    revoked = r?.status === 204;
  }
  const res = NextResponse.json({ ok: true, revoked }); res.cookies.delete('kx_gh'); return res;
}
