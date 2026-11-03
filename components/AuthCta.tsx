'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type S = 'out' | 'in';
function useAuthState(): S {
  const [s, setS] = useState<S>('out');
  useEffect(() => {
    let off: (() => void) | undefined;
    try {
      const sb = createClient();
      sb.auth.getSession().then(({ data }: { data: { session: unknown } }) => setS(data.session ? 'in' : 'out'));
      const { data } = sb.auth.onAuthStateChange((_e: string, sess: unknown) => setS(sess ? 'in' : 'out'));
      off = () => data.subscription.unsubscribe();
    } catch { /* Supabase not configured: stay logged-out */ }
    return () => off?.();
  }, []);
  return s;
}

/** Auth-aware call to action. Logged out: Sign in + Get started free. Logged in: Open workspace (+ optional Sign out). */
export default function AuthCta({ size = '', signOut = false, secondary = 'ghost' }: { size?: '' | 'sm' | 'lg'; signOut?: boolean; secondary?: 'ghost' | 'link' }) {
  const s = useAuthState();
  const sz = size ? ` ${size}` : '';
  if (s === 'in') return <>
    <Link prefetch={false} href="/app" className={`btn primary${sz}`}>Open workspace</Link>
    {signOut && <button type="button" className={`btn ghost${sz}`} onClick={async () => { await createClient().auth.signOut(); location.href = '/'; }}>Sign out</button>}
  </>;
  return <>
    <Link prefetch={false} href="/app?mode=in" className={secondary === 'link' ? undefined : `btn ghost${sz}`}>Sign in</Link>
    <Link prefetch={false} href="/app?mode=up" className={`btn primary${sz}`}>Get started free</Link>
  </>;
}

/** Single primary CTA (hero/footer band): logged out -> Get started free, logged in -> Open workspace. */
export function PrimaryCta({ size = '' }: { size?: '' | 'sm' | 'lg' }) {
  const s = useAuthState(); const sz = size ? ` ${size}` : '';
  return s === 'in' ? <Link prefetch={false} href="/app" className={`btn primary${sz}`}>Open workspace</Link>
    : <Link prefetch={false} href="/app?mode=up" className={`btn primary${sz}`}>Get started free</Link>;
}

/** Plain text link for footers: Sign in / Open workspace. */
export function AuthTextLink() {
  const s = useAuthState();
  return s === 'in' ? <Link prefetch={false} href="/app">Open workspace</Link> : <Link prefetch={false} href="/app?mode=in">Sign in</Link>;
}
