import Link from 'next/link';
import AuthCta from '@/components/AuthCta';
import type { ReactNode } from 'react';

export const OWNER = 'Chirag Koshti';
/** Set CONTACT_EMAIL, LEGAL_MAILING_ADDRESS and LEGAL_GOVERNING_STATE in the environment. Until then, pages say so plainly instead of showing fake values. */
export const CONTACT_EMAIL = (process.env.CONTACT_EMAIL ?? '').trim();
export const POSTAL_ADDRESS = (process.env.LEGAL_MAILING_ADDRESS ?? '').trim() || 'available on request (being finalized)';
export const GOVERNING_STATE = (process.env.LEGAL_GOVERNING_STATE ?? '').trim();

/** Contact email link, or a clear "coming soon" note while the inbox is being set up. */
export function Email() {
  return CONTACT_EMAIL ? <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> : <span>our support inbox (email address coming soon)</span>;
}

export default function LegalShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="landing">
      <nav className="lnav" aria-label="Main">
        <Link href="/" className="wordmark">Ikar<em>vo</em></Link>
        <div className="lnav-links"><AuthCta size="sm" /></div>
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
