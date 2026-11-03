import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Page not found', robots: { index: false } };
import Link from 'next/link';
import { PrimaryCta } from '@/components/AuthCta';
export default function NotFound() {
  return <div className="fullcenter"><div className="auth-card nf">
    <span className="kicker">404</span><h1 className="display">Nothing lives here.</h1>
    <p className="muted">The link may be old, or the page has moved.</p>
    <div className="row"><PrimaryCta /><Link href="/" className="btn ghost">Home</Link></div>
    <div className="row center" style={{ marginTop: 18, gap: 16 }}><Link href="/legal/privacy" style={{ fontSize: 13 }}>Privacy</Link><Link href="/legal/terms" style={{ fontSize: 13 }}>Terms</Link><Link href="/legal/contact" style={{ fontSize: 13 }}>Contact</Link></div>
  </div></div>;
}
