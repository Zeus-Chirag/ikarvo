import type { Metadata } from 'next';
import Link from 'next/link';
import AuthCta from '@/components/AuthCta';

export const metadata: Metadata = { title: 'Do Not Sell or Share My Personal Information · Ikarvo' };

export default function NoSalePage() {
  return (
    <div className="landing">
      <nav className="lnav" aria-label="Main">
        <Link href="/" className="wordmark">Ikar<em>vo</em></Link>
        <div className="lnav-links"><AuthCta size="sm" /></div>
      </nav>
      <main className="legal">
        <div className="legal-card">
          <span className="kicker">California CCPA/CPRA</span>
          <h1 className="display">Do Not Sell or Share My Personal Information</h1>
          <p className="muted">Effective: <time dateTime="2026-11-01">November 1, 2026</time></p>

          <section><h2>What this means</h2>
            <p>Under the California Consumer Privacy Act and the California Privacy Rights Act, you have the right to opt out of the &ldquo;sale&rdquo; or &ldquo;sharing&rdquo; of your personal information. &ldquo;Sharing&rdquo; includes disclosing personal information to third parties for cross-context behavioral advertising.</p>
          </section>

          <section><h2>Ikarvo&rsquo;s practice</h2>
            <p>Ikarvo does <strong>not</strong> sell or share your personal information, and we do not use non-functional cookies or trackers for cross-context advertising. This opt-out is therefore already satisfied for all users. If you have submitted this request anyway, no change is required to your account, and we will honor and acknowledge it.</p>
          </section>

          <section><h2>How to verify or submit</h2>
            <p>To confirm or re-request at any time, email <a href="mailto:REPLACE-WITH-CONTACT-EMAIL@example.com">REPLACE-WITH-CONTACT-EMAIL@example.com</a> with the subject <strong>&ldquo;Do Not Sell or Share&rdquo;</strong>. We will acknowledge within 10 business days. This link is provided to satisfy the CCPA/CPRA opt-out link requirement.</p>
          </section>

          <section><h2>Non-discrimination</h2>
            <p>We will not deny you goods or services, charge you different prices, or provide a lesser level of quality because you exercised this right.</p>
          </section>
        </div>
        <Link href="/" className="btn ghost">← Back to Ikarvo</Link>
      </main>
      <footer className="lfoot"><span className="wordmark">Ikar<em>vo</em></span><span className="muted small">© {new Date().getFullYear()} Ikarvo · Made for people who ship.</span></footer>
    </div>
  );
}
