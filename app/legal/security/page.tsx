import type { Metadata } from 'next';
import Link from 'next/link';
import { Email } from '@/components/legal/LegalShell';
import AuthCta from '@/components/AuthCta';

export const metadata: Metadata = { title: 'Security', description: 'How Ikarvo protects your account and data, and how to report a vulnerability.', alternates: { canonical: '/legal/security' } };

export default function SecurityPage() {
  return (
    <div className="landing">
      <nav className="lnav" aria-label="Main">
        <Link href="/" className="wordmark">Ikar<em>vo</em></Link>
        <div className="lnav-links"><AuthCta size="sm" /></div>
      </nav>
      <main className="legal">
        <div className="legal-card">
          <span className="kicker">Security</span>
          <h1 className="display">Security</h1>
          <p className="muted">Last updated: <time dateTime="2026-11-01">November 1, 2026</time></p>

          <section><h2>How we protect your data</h2>
            <p><strong>Encryption in transit.</strong> All traffic is served over HTTPS with HSTS enabled. Integration tokens are stored encrypted with AES-256-GCM and only sent back over a secure channel.</p>
            <p><strong>Encrypted sessions.</strong> Your provider tokens live in an httpOnly, encrypted session cookie that your browser&apos;s JavaScript cannot read.</p>
            <p><strong>Webhook integrity.</strong> Stripe billing webhooks verify the <code>STRIPE_WEBHOOK_SECRET</code> signature before acting, and are excluded from the site-wide security middleware so they reach Stripe exactly once.</p>
            <p><strong>Browser hardening.</strong> Every page ships strict Content-Security-Policy, <code>X-Frame-Options: DENY</code>, <code>nosniff</code>, and locked-down <code>Permissions-Policy</code> headers.</p>
          </section>

          <section><h2>Abuse protection</h2>
            <p>A per-IP rate limiter bounds all API routes to 120 requests/minute per source address, stopping single-source floods. AI generation is additionally metered per user (30 requests/hour) with automatic refunds on failed runs.</p>
          </section>

          <section><h2>Report a vulnerability</h2>
            <p>Found a security issue? We welcome responsible disclosure. Email <Email /> with the affected endpoint, reproducible steps, and the discovery date. Full policy at <Link href="/security.txt">/security.txt</Link>. We acknowledge reports within 3 business days.</p>
          </section>

          <section><h2>What we don&apos;t collect</h2>
            <p>No analytics, trackers, or third-party data exfiltration. Generated apps are instructed to exclude trackers by default.</p>
          </section>
        </div>
        <Link href="/" className="btn ghost">← Back to Ikarvo</Link>
      </main>
      <footer className="lfoot"><span className="wordmark">Ikar<em>vo</em></span><span className="muted small">© {new Date().getFullYear()} Ikarvo · Made for people who ship.</span></footer>
    </div>
  );
}
