import Link from 'next/link';
import type { ReactNode } from 'react';

export const OWNER = 'Chirag Koshti';
export const CONTACT_EMAIL = 'REPLACE-WITH-CONTACT-EMAIL@example.com';
export const POSTAL_ADDRESS = '[MAILING ADDRESS — PLACEHOLDER: owner to fill in]';

export default function LegalShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="landing">
      <nav className="lnav" aria-label="Main">
        <Link href="/" className="wordmark">Ikar<em>vo</em></Link>
        <div className="lnav-links"><Link prefetch={false} href="/app" className="btn ghost sm">Open workspace</Link></div>
      </nav>
      <main className="legal">
        <div className="legal-card">
          <span className="kicker">Legal</span>
          <h1 className="display">{title}</h1>
          <p className="muted">Effective: <time dateTime="2026-11-03">November 3, 2026</time></p>
          {children}
          <p className="small muted" style={{ marginTop: 24 }}><Link href="/">Home</Link> · <Link href="/legal/privacy">Privacy</Link> · <Link href="/legal/terms">Terms</Link> · <Link href="/legal/contact">Contact</Link></p>
        </div>
      </main>
    </div>
  );
}
