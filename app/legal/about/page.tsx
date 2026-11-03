import type { Metadata } from 'next';
import Link from 'next/link';
import { Email } from '@/components/legal/LegalShell';
import AuthCta from '@/components/AuthCta';

export const metadata: Metadata = { title: 'About & Contact', description: 'What Ikarvo is, who runs it and how to reach us.', alternates: { canonical: '/legal/about' } };

export default function AboutPage() {
  return (
    <div className="landing">
      <nav className="lnav" aria-label="Main">
        <Link href="/" className="wordmark">Ikar<em>vo</em></Link>
        <div className="lnav-links"><AuthCta size="sm" /></div>
      </nav>
      <main className="legal">
        <div className="legal-card">
          <span className="kicker">Company</span>
          <h1 className="display">About &amp; Contact</h1>

          <section><h2>What Ikarvo is</h2>
            <p>Ikarvo is a product-to-market workspace: describe a product and it builds a working app, ships it to GitHub and Vercel, produces UGC and motion ads, and plans the marketing. Every generated output is a draft — a human reviews and approves before anything ships.</p>
          </section>

          <section><h2>Contact</h2>
            <p>Reach the team for anything, from a question to a bug report:</p>
            <ul>
              <li>General &amp; support — <Email /></li>
              <li>Security (responsible disclosure) — <Email /> or <Link href="/security.txt">/security.txt</Link></li>
              <li>Privacy &amp; data requests — <Email /></li>
              <li>Legal &amp; terms — <Email /></li>
            </ul>
          </section>

          <section><h2>Documents</h2>
            <p>Full policies: <Link href="/legal/privacy">Privacy</Link> · <Link href="/legal/terms">Terms</Link> · <Link href="/legal/cookies">Cookies</Link> · <Link href="/legal/security">Security</Link> · <Link href="/legal/acceptable-use">Acceptable Use</Link></p>
          </section>
        </div>
        <Link href="/" className="btn ghost">← Back to Ikarvo</Link>
      </main>
      <footer className="lfoot"><span className="wordmark">Ikar<em>vo</em></span><span className="muted small">© {new Date().getFullYear()} Ikarvo · Made for people who ship.</span></footer>
    </div>
  );
}
