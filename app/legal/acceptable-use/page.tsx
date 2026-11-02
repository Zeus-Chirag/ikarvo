import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Acceptable Use · Ikarvo' };

export default function AcceptableUsePage() {
  return (
    <div className="landing">
      <nav className="lnav" aria-label="Main">
        <Link href="/" className="wordmark">Ikar<em>vo</em></Link>
        <div className="lnav-links"><Link prefetch={false} href="/app" className="btn ghost sm">Open workspace</Link></div>
      </nav>
      <main className="legal">
        <div className="legal-card">
          <span className="kicker">Legal</span>
          <h1 className="display">Acceptable Use</h1>
          <p className="muted">Last updated: <time dateTime="2026-11-01">November 1, 2026</time></p>

          <section><h2>What you agree not to do</h2>
            <p>By using Ikarvo you agree not to:</p>
            <ul>
              <li>Use Ikarvo to build, deploy, or market unlawful content, including material that is illegal in your jurisdiction.</li>
              <li>Use generated apps, ads, or marketing to infringe a third party&apos;s intellectual property, defame, or deceive.</li>
              <li>Circumvent rate limits, credit limits, or account restrictions, including by creating multiple accounts to farm the free tier.</li>
              <li>Reverse-engineer, decompile, or resell Ikarvo as a competing service.</li>
              <li>Use integrations to exfiltrate, scrape, or harm third-party systems or other users&apos; data.</li>
              <li>Upload or generate malware, phishing, or offensive security tooling.</li>
            </ul>
          </section>

          <section><h2>Enforcement</h2>
            <p>We may suspend or terminate access, claw back credits, or report serious abuse to the appropriate U.S. authorities where required by law. We will give notice for non-security, non-billing issues where practicable. Violations may also be reported to relevant federal agencies (e.g., FTC for deceptive practices).</p>
          </section>

          <section><h2>Relation to the Terms</h2>
            <p>This policy is part of, and subject to, the <Link href="/legal/terms">Terms of Use</Link> and <Link href="/legal/privacy">Privacy Policy</Link>. Where they conflict, the Terms of Use control. These policies are governed by the laws of the United States.</p>
          </section>

          <section><h2>Contact</h2>
            <p>Ikarvo — <a href="mailto:legal@ikarvo.com">legal@ikarvo.com</a></p>
          </section>
        </div>
        <Link href="/" className="btn ghost">← Back to Ikarvo</Link>
      </main>
      <footer className="lfoot"><span className="wordmark">Ikar<em>vo</em></span><span className="muted small">© {new Date().getFullYear()} Ikarvo · Made for people who ship.</span></footer>
    </div>
  );
}
