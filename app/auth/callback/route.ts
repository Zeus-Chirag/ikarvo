import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Email confirmation, magic-link and password-recovery landing. Failures go back to the sign-in screen with a clear message. */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const code = q.get('code');
  const next = q.get('next');
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/app';
  if (code && !q.get('error')) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, request.url));
  }
  const fail = new URL('/app', request.url);
  fail.searchParams.set('mode', 'in');
  fail.searchParams.set('authError', 'link');
  return NextResponse.redirect(fail);
}
