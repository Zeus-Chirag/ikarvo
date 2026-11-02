import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Cookie Policy · Ikarvo' };

export default function CookiesPage() {
  return (
    <div className="landing">
      <nav className="lnav" aria-label="Main">
        <Link href="/" className="wordmark">Ikar<em>vo</em></Link>
        <div className="lnav-links"><Link prefetch={false} href="/app" className="btn ghost sm">Open workspace</Link></div>
      </nav>
      <main className="legal">
        <div className="legal-card">
          <span className="kicker">Legal</span>
          <h1 className="display">Cookie Policy</h1>
          <p className="muted">Effective: <time dateTime="2026-11-01">November 1, 2026</time></p>

          <section><h2>Cookies and storage we use</h2>
            <p><strong>Session cookie.</strong> One httpOnly cookie holds your encrypted integration tokens (AES-256-GCM). It cannot be read by your browser&rsquo;s JavaScript, is sent only over HTTPS in production, and is removed when you sign out.</p>
            <p><strong>Supabase auth cookie.</strong> The Supabase SDK manages a first-party auth cookie for your signed-in session.</p>
            <p><strong>Local storage.</strong> In preview mode and for workspace preferences (theme, active project, drafts) we use your browser&rsquo;s local storage. It never leaves your device.</p>
          </section>

          <section><h2>What we do not use</h2>
            <p>No third-party ad or tracking pixels. No cross-site cookie sharing. No Google Analytics, Meta, or other third-party analytics platform. Generated apps inside Ikarvo are instructed not to include trackers.</p>
          </section>

          <section><h2>California residents: sale and sharing</h2>
            <p>Ikarvo does <strong>not sell</strong> or <strong>share</strong> personal information (as defined by the CCPA/CPRA). We do not use non-functional cookies for advertising or cross-context behavioral tracking. If you want to opt out anyway or have a question, use our &ldquo;Do Not Sell or Share My Personal Information&rdquo; link (<Link href="/legal/no-sale">opt out</Link>) or email <a href="mailto:privacy@ikarvo.com">privacy@ikarvo.com</a>.</p>
          </section>

          <section><h2>Managing cookies</h2>
            <p>Blocking the session cookie means you must sign in again. Blocking the Supabase cookie disables the signed-in experience. You can clear cookies from your browser settings at any time; no functionality outside your workspace depends on them.</p>
          </section>

          <section><h2>Contact</h2>
            <p>Ikarvo — <a href="mailto:privacy@ikarvo.com">privacy@ikarvo.com</a></p>
          </section>
        </div>
        <Link href="/" className="btn ghost">← Back to Ikarvo</Link>
      </main>
      <footer className="lfoot"><span className="wordmark">Ikar<em>vo</em></span><span className="muted small">© {new Date().getFullYear()} Ikarvo · Made for people who ship.</span></footer>
    </div>
  );
}
