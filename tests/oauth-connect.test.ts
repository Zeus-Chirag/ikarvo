import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * These tests drive the real route handlers. They exist because the failure users report is
 * "I click Connect and it never comes back connected" — which is almost always a redirect_uri
 * that does not match what is registered with the provider, or a state cookie that was never
 * sent. Everything below is asserted against the URL we actually hand to the provider.
 */

const PUBLIC_ORIGIN = 'https://ikarvo.vercel.app';

/** Every env key any of these routes reads. Cleared before each test so cases never leak. */
const MANAGED = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'APP_URL', 'NEXT_PUBLIC_APP_URL', 'SESSION_SECRET', 'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'VERCEL_CLIENT_ID', 'VERCEL_CLIENT_SECRET', 'VERCEL_INTEGRATION_SLUG'];

const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of MANAGED) { saved[k] = process.env[k]; delete process.env[k]; }
});

afterEach(() => {
  for (const k of MANAGED) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.unstubAllGlobals();
});

function configureGithub() {
  process.env.SESSION_SECRET = 'test-secret-that-is-long-enough';
  process.env.GITHUB_CLIENT_ID = 'client-abc';
  process.env.GITHUB_CLIENT_SECRET = 'secret-abc';
}

function connectRequest(path: string) {
  return new NextRequest(`${PUBLIC_ORIGIN}${path}`, { headers: { host: 'ikarvo.vercel.app' } });
}

describe('GitHub connect', () => {
  it('sends the provider a redirect_uri on the public origin', async () => {
    configureGithub();
    const { GET } = await import('@/app/api/github/connect/route');
    const res = await GET(connectRequest('/api/github/connect'));

    expect(res.status).toBe(307);
    const location = new URL(res.headers.get('location')!);
    expect(location.origin).toBe('https://github.com');
    expect(location.searchParams.get('redirect_uri')).toBe(`${PUBLIC_ORIGIN}/api/github/callback`);
  });

  it('ignores a stale localhost APP_URL left over from .env.example', async () => {
    configureGithub();
    // This is the exact value shipped in .env.example. Copying it into a deployment must not
    // point GitHub (or the user's browser) at localhost.
    process.env.APP_URL = 'http://localhost:3000';
    const { GET } = await import('@/app/api/github/connect/route');
    const res = await GET(connectRequest('/api/github/connect'));

    const redirectUri = new URL(res.headers.get('location')!).searchParams.get('redirect_uri');
    expect(redirectUri).toBe(`${PUBLIC_ORIGIN}/api/github/callback`);
  });

  it('uses the proxied public host when the runtime reports an internal address', async () => {
    configureGithub();
    process.env.APP_URL = 'http://localhost:3000';
    // Behind a proxy the URL the runtime sees is the internal listener, so forwarded headers are
    // the only thing that carries the real public hostname.
    const req = new NextRequest('http://127.0.0.1:3000/api/github/connect', {
      headers: { host: '127.0.0.1:3000', 'x-forwarded-host': 'ikarvo.vercel.app', 'x-forwarded-proto': 'https' },
    });
    const { GET } = await import('@/app/api/github/connect/route');
    const res = await GET(req);

    const redirectUri = new URL(res.headers.get('location')!).searchParams.get('redirect_uri');
    expect(redirectUri).toBe(`${PUBLIC_ORIGIN}/api/github/callback`);
  });

  it('honours a real APP_URL so a custom domain is used instead of the deployment host', async () => {
    configureGithub();
    process.env.APP_URL = 'https://app.ikarvo.com/';
    const { GET } = await import('@/app/api/github/connect/route');
    const res = await GET(connectRequest('/api/github/connect'));

    const redirectUri = new URL(res.headers.get('location')!).searchParams.get('redirect_uri');
    expect(redirectUri).toBe('https://app.ikarvo.com/api/github/callback');
  });

  it('sets the state cookie it will check on the way back', async () => {
    configureGithub();
    const { GET } = await import('@/app/api/github/connect/route');
    const res = await GET(connectRequest('/api/github/connect'));

    const state = new URL(res.headers.get('location')!).searchParams.get('state');
    const cookie = res.cookies.get('kx_gh_state');
    expect(state).toBeTruthy();
    expect(cookie?.value).toBe(state);
    expect(cookie?.httpOnly).toBe(true);
  });

  it('names the exact missing variables instead of failing silently', async () => {
    const { GET } = await import('@/app/api/github/connect/route');
    const res = await GET(connectRequest('/api/github/connect'));

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.setup).toEqual(['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'SESSION_SECRET']);
    expect(body.error).toContain('GITHUB_CLIENT_ID');
  });
});

describe('GitHub callback', () => {
  it('rejects a callback whose state does not match the cookie', async () => {
    configureGithub();
    const { GET } = await import('@/app/api/github/callback/route');
    const req = new NextRequest(`${PUBLIC_ORIGIN}/api/github/callback?code=c&state=wrong`, { headers: { cookie: 'kx_gh_state=expected' } });
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('error=github_state');
  });

  it('rejects a callback with no state cookie at all', async () => {
    configureGithub();
    const { GET } = await import('@/app/api/github/callback/route');
    const req = new NextRequest(`${PUBLIC_ORIGIN}/api/github/callback?code=c&state=anything`);
    const res = await GET(req);

    expect(res.headers.get('location')).toContain('error=github_state');
  });

  it('exchanges the code and seals the token when state matches', async () => {
    configureGithub();
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('github.com/login/oauth/access_token')) return Response.json({ access_token: 'gho_test' });
      if (url.includes('api.github.com/user')) return Response.json({ login: 'octocat' });
      throw new Error(`unexpected fetch ${url}`);
    }));

    const { GET } = await import('@/app/api/github/callback/route');
    const req = new NextRequest(`${PUBLIC_ORIGIN}/api/github/callback?code=code123&state=st`, { headers: { cookie: 'kx_gh_state=st' } });
    const res = await GET(req);

    expect(res.headers.get('location')).toContain('connected=github');
    expect(res.cookies.get('kx_gh')?.value).toBeTruthy();
    // The sealed blob must not leak the raw token.
    expect(res.cookies.get('kx_gh')?.value).not.toContain('gho_test');
  });

  it('explains a redirect_uri_mismatch instead of a bare provider error code', async () => {
    configureGithub();
    const { GET } = await import('@/app/api/github/callback/route');
    const req = new NextRequest(`${PUBLIC_ORIGIN}/api/github/callback?error=redirect_uri_mismatch&error_description=The+redirect_uri+MUST+match`);
    const res = await GET(req);

    const location = new URL(res.headers.get('location')!);
    expect(location.searchParams.get('error')).toBe('github_redirect_uri_mismatch');
    // The user (and the admin) needs to know exactly which URL to register.
    expect(location.searchParams.get('hint')).toBe(`${PUBLIC_ORIGIN}/api/github/callback`);
  });
});

describe('Google connect', () => {
  function configureGoogle() {
    process.env.SESSION_SECRET = 'test-secret-that-is-long-enough';
    process.env.GOOGLE_CLIENT_ID = 'g-id';
    process.env.GOOGLE_CLIENT_SECRET = 'g-secret';
  }

  it('sends a public redirect_uri even with a stale localhost APP_URL', async () => {
    configureGoogle();
    process.env.APP_URL = 'http://localhost:3000';
    const { GET } = await import('@/app/api/google/connect/route');
    const res = await GET(connectRequest('/api/google/connect?back=integrations'));

    const location = new URL(res.headers.get('location')!);
    expect(location.origin).toBe('https://accounts.google.com');
    expect(location.searchParams.get('redirect_uri')).toBe(`${PUBLIC_ORIGIN}/api/google/callback`);
    expect(location.searchParams.get('access_type')).toBe('offline');
    expect(res.cookies.get('kx_gg_state')?.value).toBe(location.searchParams.get('state'));
  });
});

describe('Vercel connect', () => {
  function configureVercel() {
    process.env.SESSION_SECRET = 'test-secret-that-is-long-enough';
    process.env.VERCEL_CLIENT_ID = 'vc-id';
    process.env.VERCEL_CLIENT_SECRET = 'vc-secret';
    process.env.VERCEL_INTEGRATION_SLUG = 'ikarvo';
  }

  it('redirects to the integration install page with a state cookie', async () => {
    configureVercel();
    const { GET } = await import('@/app/api/vercel/connect/route');
    const res = await GET();

    const location = new URL(res.headers.get('location')!);
    expect(location.origin).toBe('https://vercel.com');
    expect(location.pathname).toBe('/integrations/ikarvo/new');
    expect(res.cookies.get('kx_vc_state')?.value).toBe(location.searchParams.get('state'));
  });

  it('rejects a callback that omits state', async () => {
    configureVercel();
    const { GET } = await import('@/app/api/vercel/callback/route');
    const res = await GET(new NextRequest(`${PUBLIC_ORIGIN}/api/vercel/callback?code=c`, { headers: { cookie: 'kx_vc_state=st' } }));

    expect(res.headers.get('location')).toContain('error=vercel_state');
  });

  it('rejects a callback whose state does not match the cookie', async () => {
    configureVercel();
    const { GET } = await import('@/app/api/vercel/callback/route');
    const res = await GET(new NextRequest(`${PUBLIC_ORIGIN}/api/vercel/callback?code=c&state=other`, { headers: { cookie: 'kx_vc_state=st' } }));

    expect(res.headers.get('location')).toContain('error=vercel_state');
  });

  it('binds the team from the callback query when Vercel sends one', async () => {
    configureVercel();
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ access_token: 'vca_test' })));

    const { GET } = await import('@/app/api/vercel/callback/route');
    const res = await GET(new NextRequest(`${PUBLIC_ORIGIN}/api/vercel/callback?code=c&state=st&teamId=team_123`, { headers: { cookie: 'kx_vc_state=st' } }));

    expect(res.headers.get('location')).toContain('connected=vercel');
    const sealed = res.cookies.get('kx_vc')?.value;
    expect(sealed).toBeTruthy();
    // Unseal with the same secret to prove the team was persisted.
    const { unseal } = await import('@/lib/seal');
    expect(unseal<{ token: string; teamId: string | null }>(sealed)).toMatchObject({ token: 'vca_test', teamId: 'team_123' });
  });
});
