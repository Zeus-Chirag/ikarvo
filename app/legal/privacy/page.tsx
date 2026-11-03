import type { Metadata } from 'next';
import Link from 'next/link';
import AuthCta from '@/components/AuthCta';

export const metadata: Metadata = { title: 'Privacy Policy · Ikarvo' };

export default function PrivacyPage() {
  return (
    <div className="landing">
      <nav className="lnav" aria-label="Main">
        <Link href="/" className="wordmark">Ikar<em>vo</em></Link>
        <div className="lnav-links"><AuthCta size="sm" /></div>
      </nav>
      <main className="legal">
        <div className="legal-card">
          <span className="kicker">Legal</span>
          <h1 className="display">Privacy Policy</h1>
          <p className="muted">Effective: <time dateTime="2026-11-01">November 1, 2026</time> · For residents of the United States (including California, CCPA/CPRA).</p>
          <p><strong>Controller.</strong> Ikarvo is operated by Chirag Koshti, mailing address [MAILING ADDRESS — PLACEHOLDER: owner to fill in]. California residents: see <Link href="/legal/no-sale">Do Not Sell or Share My Personal Information</Link>.</p>

          <section><h2>1. Information we collect</h2>
            <p><strong>Account data.</strong> Email address and a salted, hashed password when you create an account (Supabase Auth; we never see your plaintext password).</p>
            <p><strong>Workspace content.</strong> Prompts, generated apps, ad scripts, marketing documents, and the integrations you connect. Stored so your workspace works; you can export or delete them.</p>
            <p><strong>Provider tokens.</strong> When you connect GitHub, Vercel, Stripe, Meta, or others, the token is encrypted (AES-256-GCM) and kept in an httpOnly session cookie. Used only to call that service on your behalf.</p>
            <p><strong>Site analysis.</strong> When you audit a website, we fetch and analyze its public pages (titles, meta, headings, links, weight). We never crawl logged-in or private pages.</p>
            <p><strong>Usage data.</strong> Basic server logs (IP, timestamps, endpoint, status) for security and abuse protection. No cross-site tracking, no advertising pixels.</p>
          </section>

          <section><h2>2. How we use it</h2>
            <p>To operate the service you asked for: run AI generation, call connected providers, and produce your output. We do <strong>not sell</strong> personal information, and we do <strong>not share</strong> it with third parties for advertising. &ldquo;Sharing&rdquo; under CCPA/CPRA means transferring data to a third party that monetizes it; Ikarvo does not do this. Data is processed by the providers you enable (Supabase, AI and media providers) strictly to deliver requested output; we do not use your content to train models.</p>
          </section>

          <section><h2>3. Cookies and storage</h2>
            <p>One httpOnly cookie holds your encrypted provider tokens. Supabase manages its own first-party auth cookie. In preview mode, all data stays in your browser&rsquo;s local storage and never leaves your device. No third-party tracking cookies. See our <Link href="/legal/cookies">Cookie Policy</Link>.</p>
          </section>

          <section><h2>4. Your California (CCPA/CPRA) rights</h2>
            <p>California residents may exercise, at most once every <strong>12 months</strong> (once every 45 days for access under CPRA):</p>
            <ul>
              <li><strong>Right to know / access</strong> — what personal information we collect about you.</li>
              <li><strong>Right to delete</strong> — request deletion of your personal information.</li>
              <li><strong>Right to correct</strong> — correct inaccurate personal information.</li>
              <li><strong>Right to opt out of sale or sharing</strong> — we do not sell or share; this is already your state.</li>
              <li><strong>Right to limit use of sensitive PI</strong> — we do not use sensitive data for profiling or prediction.</li>
              <li><strong>Right to non-discrimination</strong> — you may not be penalized for exercising these rights.</li>
            </ul>
            <p><strong>Non-discrimination.</strong> We will not deny goods/services, charge different prices, or provide a different level of quality because you exercised a privacy right.</p>
            <p>Submit requests to <a href="mailto:REPLACE-WITH-CONTACT-EMAIL@example.com">REPLACE-WITH-CONTACT-EMAIL@example.com</a>. We acknowledge within <strong>10 business days</strong> and act within the 45-day CPRA window (extendable once by 45 days).</p>
          </section>

          <section><h2>5. Data retention and deletion</h2>
            <p>Your documents remain until you delete them. Closing your account deletes your workspace data (server-side cascade). Provider-side content you published (repos, ads, posts) belongs to those platforms — disconnecting stops our access but does not undo publication.</p>
          </section>

          <section><h2>6. Children&rsquo;s privacy (COPPA)</h2>
            <p>Ikarvo is not directed at children under 13, and we do not knowingly collect their personal information. If you believe a child under 13 submitted data to us, contact us and we will delete it promptly.</p>
          </section>

          <section><h2>7. Security</h2>
            <p>Data is encrypted in transit (TLS/HSTS) and at rest (provider storage + AES-256-GCM for tokens). Access is role-scoped. See our <Link href="/legal/security">Security</Link> page and <Link href="/security.txt">vulnerability disclosure</Link>.</p>
          </section>

          <section><h2>8. Changes &amp; contact</h2>
            <p>We will update this policy for material changes and post the revised version here. Questions or rights requests: <a href="mailto:REPLACE-WITH-CONTACT-EMAIL@example.com">REPLACE-WITH-CONTACT-EMAIL@example.com</a>.</p>
          </section>
        </div>
        <Link href="/" className="btn ghost">← Back to Ikarvo</Link>
      </main>
      <footer className="lfoot"><span className="wordmark">Ikar<em>vo</em></span><span className="muted small">© {new Date().getFullYear()} Ikarvo · Made for people who ship.</span></footer>
    </div>
  );
}
