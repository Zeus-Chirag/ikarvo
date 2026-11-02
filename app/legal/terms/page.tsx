import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Terms of Use · Ikarvo' };

export default function TermsPage() {
  return (
    <div className="landing">
      <nav className="lnav" aria-label="Main">
        <Link href="/" className="wordmark">Ikar<em>vo</em></Link>
        <div className="lnav-links"><Link prefetch={false} href="/app" className="btn ghost sm">Open workspace</Link></div>
      </nav>
      <main className="legal">
        <div className="legal-card">
          <span className="kicker">Legal</span>
          <h1 className="display">Terms of Use</h1>
          <p className="muted">Effective: <time dateTime="2026-11-01">November 1, 2026</time></p>

          <section><h2>1. Acceptance</h2>
            <p>By creating an account or using Ikarvo you agree to these Terms, our <Link href="/legal/privacy">Privacy Policy</Link>, and our <Link href="/legal/acceptable-use">Acceptable Use Policy</Link>. If you act for a company, you bind that company. If you do not agree, do not use the service.</p>
          </section>

          <section><h2>2. What Ikarvo does</h2>
            <p>Ikarvo is a workspace that (1) builds working apps/websites from your prompts, (2) ships them to GitHub and Vercel, (3) produces UGC and motion ads, and (4) plans and drafts marketing content. Everything Ikarvo generates is a <strong>starting draft</strong>. You review, own, and approve what ships. Ikarvo does not send data to third parties on your behalf without your approval or an explicit schedule you configured.</p>
          </section>

          <section><h2>3. Generated output &amp; accuracy</h2>
            <p>You own output Ikarvo generates, subject to the licenses of any AI or media providers you connect. Ikarvo makes no ownership claim to your content, repositories, or ad accounts. Generated code, copy, and numbers are AI-assisted: test builds before shipping, verify marketing claims before publishing, and check AI figures against primary sources. You are responsible for what you publish.</p>
          </section>

          <section><h2>4. Credits, billing &amp; refunds</h2>
            <p>Free accounts get a monthly credit pool; paid plans add more. Credits are consumed by generation/tool runs and refunded automatically when a run fails. Paid plans renew monthly; you may cancel any time and keep the plan until the period ends. Manage billing in the Stripe portal linked on your Billing page.</p>
          </section>

          <section><h2>5. Integrations &amp; your accounts</h2>
            <p>When you connect GitHub, Vercel, Stripe, Meta, WordPress, or other services, you are responsible for the access you grant and for keeping those credentials current. Ikarvo stores tokens encrypted (AES-256-GCM, httpOnly) and uses them only to act in your account. Disconnecting stops Ikarvo from using that token.</p>
          </section>

          <section><h2>6. Acceptable use</h2>
            <p>You agree not to use Ikarvo to build or ship unlawful content, infringe a third party&rsquo;s rights, scrape or attack third-party systems, resell Ikarvo as a competing product, reverse-engineer it, or misuse credits (e.g., farming the free tier across many accounts). See the <Link href="/legal/acceptable-use">Acceptable Use Policy</Link>.</p>
          </section>

          <section><h2>7. Disclaimer &amp; limitation of liability</h2>
            <p>Ikarvo is provided &ldquo;as is&rdquo; without warranties of any kind. We do not guarantee that generated apps, campaigns, or content are error-free, complete, or fit for a particular purpose. To the maximum extent permitted by applicable law, Ikarvo and its operators are not liable for indirect, incidental, special, consequential, or punitive damages, or for data loss from provider services you connect. Some jurisdictions do not allow exclusion of certain warranties or limitation of liability, so some parts may not apply to you.</p>
          </section>

          <section><h2>8. Indemnity</h2>
            <p>You agree to indemnify Ikarvo against claims arising from your use of the service, your content, or your violation of these Terms or law. This does not limit rights you may have under applicable law.</p>
          </section>

          <section><h2>9. Termination</h2>
            <p>We may suspend or terminate access if you breach these Terms, are ordered to do so by law, or cease to offer the service. We will give notice where practicable except for security incidents. Provisions that should survive termination (ownership, liability, disputes) do.</p>
          </section>

          <section><h2>10. Dispute resolution (arbitration &amp; class waiver)</h2>
            <p><strong>Mandatory arbitration.</strong> Any dispute arising out of these Terms or the service will be resolved by binding arbitration under the rules of a nationally recognized U.S. arbitration body, in your home state or the state of our principal place of business. <strong>Class action waiver.</strong> You and Ikarvo agree to resolve disputes individually, not as a class or consolidated proceeding, except where prohibited by law. You have 30 days from these Terms taking effect to reject arbitration by written notice; if you do not, arbitration applies. Nothing in this section prevents either party from seeking injunctive or equitable relief to protect intellectual property or confidential information.</p>
            <p><strong>Jury waiver.</strong> TO THE EXTENT PERMITTED, YOU WAIVE THE RIGHT TO A JURY TRIAL.</p>
          </section>

          <section><h2>11. Governing law</h2>
            <p>These Terms are governed by the laws of the State of <strong>[Delaware / your state of incorporation]</strong>, without regard to conflict-of-law rules, and by the United States Federal Arbitration Act. Venue for any permitted court action lies in state and federal courts in that jurisdiction. (Fill in your actual state of incorporation before launch.)</p>
          </section>

          <section><h2>12. Compliance with U.S. law</h2>
            <p>You are responsible for complying with all laws applicable to your use of Ikarvo, including the FTC Act (no deceptive marketing or unsupported claims), CAN-SPAM (email you send via integrations), sector-specific rules, and export controls. We may report conduct that we believe violates U.S. law.</p>
          </section>

          <section><h2>13. Changes</h2>
            <p>We may update these Terms. For material changes we will post the new version here and, where appropriate, notify you in-app. Continued use after a change means you accept the updated Terms.</p>
          </section>

          <section><h2>14. Contact</h2>
            <p>Ikarvo — <a href="mailto:legal@example.com">legal@example.com</a> (replace with your real inbox before launch).</p>
          </section>
        </div>
        <Link href="/" className="btn ghost">← Back to Ikarvo</Link>
      </main>
      <footer className="lfoot"><span className="wordmark">Ikar<em>vo</em></span><span className="muted small">© {new Date().getFullYear()} Ikarvo · Made for people who ship.</span></footer>
    </div>
  );
}
