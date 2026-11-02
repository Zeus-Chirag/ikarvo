import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'About & Contact · Ikarvo' };

export default function AboutPage() {
  return (
    <div className="landing">
      <nav className="lnav" aria-label="Main">
        <Link href="/" className="wordmark">Ikar<em>vo</em></Link>
        <div className="lnav-links"><Link prefetch={false} href="/app" className="btn ghost sm">Open workspace</Link></div>
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
              <li>General &amp; support — <a href="mailto:support@ikarvo.com">support@ikarvo.com</a></li>
              <li>Security (responsible disclosure) — <a href="mailto:security@ikarvo.com">security@ikarvo.com</a> or <Link href="/security.txt">/security.txt</Link></li>
              <li>Privacy &amp; data requests — <a href="mailto:privacy@ikarvo.com">privacy@ikarvo.com</a></li>
              <li>Legal &amp; terms — <a href="mailto:legal@ikarvo.com">legal@ikarvo.com</a></li>
            </ul>
            <p className="small muted">All example addresses above are placeholders — replace them with your real inboxes before launch. Ikarvo is a United States company; for entity details (legal name, state of incorporation, registered agent), update this page before launch.</p>
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
