import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { clientIp, rateLimit } from '@/lib/ratelimit';

/** Per-IP API flood guard: 120 requests/minute per source IP across all /api routes. */
const API_LIMIT = 120;
const API_WINDOW = 60_000;

/** Build a Content-Security-Policy that allows the configured Supabase origin
 * (used by the client SDK to fetch auth) without opening the floor to any host. */
function csp() {
  const sb = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
  const conn = [`'self'`];
  if (sb) conn.push(sb);
  // Dev-only: Next.js dev server uses eval() for React Fast Refresh / HMR.
  // Production builds never eval, so keep script-src strict there.
  const devEval = process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : '';
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${devEval}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://images.unsplash.com",
    "font-src 'self'",
    `connect-src ${conn.join(' ')}`,
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

const securityHeaders = (): Record<string, string> => ({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': csp(),
});

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  Object.entries(securityHeaders()).forEach(([k, v]) => response.headers.set(k, v));

  // API flood guard (all API routes except the Stripe webhook, which is on the matcher exclusion).
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const rl = rateLimit(clientIp(request), API_LIMIT, API_WINDOW);
    if (!rl.ok) {
      return NextResponse.json({ error: 'Too many requests. Slow down and try again.' }, {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) },
      });
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (process.env.PREVIEW_MODE === '1' || !url || !key) return response;
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        Object.entries(securityHeaders()).forEach(([k, v]) => response.headers.set(k, v));
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|api/billing/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'] };
