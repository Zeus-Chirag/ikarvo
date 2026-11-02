'use client';
import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <div className="fullcenter"><div className="auth-card nf">
    <span className="kicker">Error</span><h1 className="display">Something went wrong.</h1>
    <p className="muted">Please try again. If it keeps happening, <Link href="/legal/contact">contact us</Link>.</p>
    <div className="row"><button type="button" className="btn primary" onClick={reset}>Try again</button><Link href="/" className="btn ghost">Home</Link></div>
  </div></div>;
}
