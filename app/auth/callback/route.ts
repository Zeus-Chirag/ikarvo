import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next = request.nextUrl.searchParams.get('next');
  const destination = new URL(next?.startsWith('/') ? next : '/', request.url);
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(destination);
  }
  destination.pathname = '/';
  destination.searchParams.set('authError', 'confirmation');
  return NextResponse.redirect(destination);
}
