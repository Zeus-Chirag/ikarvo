import type { Metadata } from 'next';
import Link from 'next/link';
import AuthCta from '@/components/AuthCta';
import Pricing from '@/components/Pricing';
import { plans } from '@/lib/plans';

export const metadata: Metadata = { title: 'Pricing · Ikarvo', description: 'Simple credit-based pricing for Ikarvo, your AI CMO. Free, Starter, Pro and Agency plans with UGC videos included on Pro and Agency.' };

export default function PricingPage() {
  const p = plans();
  return <div className="landing">
    <nav className="lnav" aria-label="Main"><Link href="/" className="wordmark">Ikar<em>vo</em></Link>
      <div className="lnav-links"><Link href="/#features">Features</Link><Link href="/pricing" className="keep" aria-current="page">Pricing</Link><AuthCta size="sm" /></div></nav>
    <main className="pricing-page">
      <header className="center"><span className="kicker">Pricing</span><h1 className="display">Pay for what the agents do.</h1>
        <p className="muted">Every plan includes every agent. Plans differ in monthly credits and included videos. Failed actions are always refunded.</p></header>
      <Pricing plans={p.plans} addons={p.addons} checkout={p.checkout} contact={(process.env.CONTACT_EMAIL ?? '').trim()} />
    </main>
    <footer className="lfoot"><span className="wordmark">Ikar<em>vo</em></span>
      <nav aria-label="Footer" style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}><Link href="/">Home</Link><Link href="/pricing">Pricing</Link><Link href="/legal/terms">Terms</Link><Link href="/legal/refund">Refunds</Link><Link href="/legal/contact">Contact</Link></nav>
      <span className="muted small">© {new Date().getFullYear()} Ikarvo</span></footer>
  </div>;
}
