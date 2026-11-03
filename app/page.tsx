import { plans } from '@/lib/plans';
import { appUrl, featureStatus } from '@/lib/env';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import Icon from '@/components/Icon';
import LandingMotion from '@/components/LandingMotion';
import AuthCta, { PrimaryCta, AuthTextLink } from '@/components/AuthCta';
import type { Metadata } from 'next';

const SITE = appUrl('https://ikarvo.vercel.app');

export const metadata: Metadata = {
  title: 'Ikarvo: build the product, then sell it',
  description: 'One workspace to build, ship and market your product: a prompt-to-app builder with live preview, an ad studio for UGC and motion ads, and an AI marketing planner. Free to start.',
  openGraph: {
    title: 'Ikarvo: build the product, then sell it',
    description: 'Describe the product. Ikarvo builds it, deploys it, writes the ads and the launch plan. One workspace instead of six tabs.',
    siteName: 'Ikarvo',
    url: SITE,
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ikarvo: build the product, then sell it',
    description: 'Prompt-to-app builder, GitHub + Vercel shipping, ad studio, and an AI marketing planner. One workspace.',
  },
  alternates: {
    canonical: SITE,
  },
  robots: { index: true, follow: true },
};

const JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Ikarvo',
  url: SITE,
  description: 'One workspace to build, ship, advertise and market a product.',
};
export const dynamic = 'force-dynamic';

const STEPS = [
  { n: '01', t: 'Build', h: 'Describe it. Watch it run.', p: 'Write what you want in plain language. Ikarvo writes a complete, working app and runs it in a sandboxed live preview on desktop, tablet and phone. Then keep talking to it until it’s right.', v: 'build' },
  { n: '02', t: 'Ship', h: 'Your repo. Your Vercel. One click.', p: 'Connect GitHub with OAuth and every version commits to a repo you own. Deploy to Vercel through its API and get a live URL. ', v: 'ship' },
  { n: '03', t: 'Advertise', h: 'Scripts, motion and footage.', p: 'Turn the product into UGC scripts with hooks and shot lists. Render motion-graphic and launch ads right in the browser and export them as video. ', v: 'ads' },
  { n: '04', t: 'Market', h: 'A launch plan, not a blank page.', p: 'The AI CMO reads your site and writes the strategy, then drafts posts, articles and lifecycle emails from it. When you are ready to pay for reach, it builds Meta Ads campaigns from your Ad Studio renders and creates them paused until you approve the spend.', v: 'market' },
];

function Vignette({ v }: { v: string }) {
  if (v === 'build') return <div className="vig vig-build"><div className="vb-prompt"><span>prompt</span>A booking page for a one-person yoga studio…</div><div className="vb-page"><b>Slow Flow</b><i /><i /><div className="vb-row"><em /><em /><em /></div></div></div>;
  if (v === 'ship') return <div className="vig vig-ship"><div><span className="dotg" />github.com/you/slow-flow <small>committed · index.html</small></div><div><span className="dotg" />slow-flow.vercel.app <small>ready · 14s</small></div><div><span className="doto" />Stripe Checkout <small>test mode</small></div></div>;
  if (v === 'ads') return <div className="vig vig-ads"><div className="phone"><span>Your idea,</span><span className="acc">running by lunch.</span><i /></div><ol><li>0–3s · Hook on face cam</li><li>3–9s · Screen demo</li><li>9–15s · CTA card</li></ol></div>;
  return <div className="vig vig-market">{[['Tue 10:00', 'X', 'Shipped a booking app in an afternoon. Here’s the prompt.'], ['Wed 12:30', 'LinkedIn', 'What we learned building 40 prototypes in a week.'], ['Thu 18:00', 'TikTok', 'POV: your landing page writes itself.']].map(([d, c, t]) => <div key={d}><b>{d}</b><span className="chip">{c}</span><p>{t}</p></div>)}</div>;
}

const FEATS: [string, string, string][] = [
  ['build', 'Prompt-to-app builder', 'Single-file or multi-page apps with a sandboxed live preview on desktop, tablet and phone. Edit by talking to it.'],
  ['github', 'GitHub + Vercel shipping', 'Every version commits to a repo you own, and deploys to your Vercel with a live URL.'],
  ['film', 'Ad Studio', 'UGC scripts with hooks and shot lists, and motion-graphic launch videos rendered in your browser.'],
  ['home', 'AI CMO', 'Reads your site, writes the strategy, then drafts posts, articles and emails from that one brief.'],
  ['megaphone', 'Meta Ads', 'Audience plans resolved against the real targeting API. Campaigns are created paused until you approve spend.'],
  ['calendar', 'Launch calendar', 'Schedule and publish to X and LinkedIn, export .ics and .csv, and track what went out.'],
];

export default function Landing() {
  const stripe = featureStatus().stripe.ok;
  return <div className="landing"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD) }} /><LandingMotion />
    <nav className="lnav" aria-label="Main"><Link href="/" className="wordmark">Ikar<em>vo</em></Link>
      <div className="lnav-links"><a href="#how">Product</a><a href="#features">Features</a><a href="#pricing">Pricing</a><ThemeToggle /><AuthCta signOut /></div></nav>

    <main id="main">
    <header className="hero">
      <a href="#how" className="hero-badge"><b>New</b>Motion ads you can export as video <span aria-hidden>→</span></a>
      <h1 className="display" aria-label="Build the product. Then sell it."><span aria-hidden><span className="w">Build</span> <span className="w">the</span> <span className="w">product.</span><br /><span className="w"><em>Then</em></span> <span className="w">sell</span> <span className="w">it.</span></span></h1>
      <p className="lede">Ikarvo takes a prompt and gives you a working app, a GitHub repo, a live deployment, ads to promote it and a launch plan to market it. One workspace instead of six tabs.</p>
      <div className="row center-row"><PrimaryCta size="lg" /><a href="#how" className="btn ghost lg">See how it works</a></div>
      <p className="hero-note">Free to start · No credit card required</p>
      <div className="hero-frame demo" role="img" aria-label="Animated demo: a prompt is typed, Ikarvo generates a landing page, and it deploys to Vercel.">
        <div className="hf-bar"><i /><i /><i /><span>ikarvo.vercel.app/app</span><span className="hf-live"><i />Live demo</span></div>
        <div className="hf-body">
          <div className="hf-side">{['AI CMO', 'Build', 'Projects', 'Ad Studio', 'Marketing', 'Integrations'].map((x, i) => <span key={x} className={i === 1 ? 'on' : ''}>{x}</span>)}</div>
          <div className="hf-compose"><span className="label">What are we building?</span><p><span className="typed">A landing page for Ledgerly, bookkeeping for freelancers, with a pricing toggle and FAQ.</span></p><span className="hf-btn">Generate app</span>
            <ol className="hf-steps"><li>Layout &amp; sections</li><li>Styles &amp; type</li><li>Pricing toggle script</li><li>Deployed to Vercel</li></ol></div>
          <div className="hf-preview"><div className="hp-nav"><b>Ledgerly</b><span /><span /><span /></div><p className="hp-h">Books that<br />balance themselves.</p><div className="hp-cards"><i /><i /><i /></div>
            <span className="hf-deploy"><i />ledgerly.vercel.app · ready</span></div>
        </div>
      </div>
    </header>


    <section id="how" className="steps">{STEPS.map(s => <article key={s.n} className="step reveal">
      <div className="step-n"><span>{s.n}</span>{s.t}</div>
      <div className="step-copy"><h2 className="display">{s.h}</h2><p>{s.p}</p></div>
      <Vignette v={s.v} />
    </article>)}</section>

    <section id="features" className="feats">
      <div className="feats-head reveal"><div><span className="kicker">Everything in one place</span><h2 className="display">Six tools, one brief.</h2></div><p>Each part reads the same product brief, so the app, the ads and the posts all say the same thing.</p></div>
      <div className="feat-grid reveal">{FEATS.map(([ic, t, d]) => <article key={t} className="feat"><span className="ic"><Icon name={ic} /></span><h3>{t}</h3><p>{d}</p></article>)}</div>
    </section>



    <section id="pricing" className="pricing reveal">
      <h2 className="display">Pay for what the agents do.</h2>
      <p className="muted center">Both plans include every feature. They differ only in monthly credits. Each AI action has a fixed credit cost, and failed actions are refunded.</p>
      <div className="plans">
        {plans().plans.map(p => <article key={p.id} className={`card plan ${p.id === 'pro' ? 'current' : ''}`}><h3>{p.name}</h3><div className="price">{p.price}</div><p className="small muted">{p.blurb}</p><ul className="ticks">{p.perks.map(x => <li key={x}>{x}</li>)}</ul>{p.id === 'pro' && !stripe ? <span className="btn wide" aria-disabled="true">Coming soon</span> : <Link prefetch={false} className={`btn wide ${p.id === 'pro' ? 'primary' : ''}`} href={p.id === 'pro' ? '/app?view=billing' : '/app?mode=up'}>{p.id === 'pro' ? 'Upgrade' : 'Start free'}</Link>}</article>)}
      </div>
    </section>

    <section className="cta reveal"><div><h2 className="display">Ship it <em>today.</em></h2><p>Describe the product. Ikarvo builds it, deploys it and writes the launch.</p><div className="row center-row"><PrimaryCta size="lg" /><a href="#pricing" className="btn ghost lg">See pricing</a></div></div></section>

    </main>
    <footer className="lfoot"><span className="wordmark">Ikar<em>vo</em></span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, padding: '0 24px' }}>
        <nav aria-label="Footer" style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          <a href="#how">Product</a><a href="#features">Features</a><a href="#pricing">Pricing</a><AuthTextLink />
        </nav>
        <nav aria-label="Legal" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12.5 }}>
          <Link prefetch={false} href="/legal/privacy">Privacy</Link>
          <Link prefetch={false} href="/legal/terms">Terms</Link>
          <Link prefetch={false} href="/legal/cookies">Cookies</Link>
          <Link prefetch={false} href="/legal/no-sale">Do Not Sell or Share</Link>
          <Link prefetch={false} href="/legal/security">Security</Link>
          <Link prefetch={false} href="/legal/acceptable-use">Acceptable Use</Link>
          <Link prefetch={false} href="/legal/refund">Refunds &amp; Cancellation</Link>
          <Link prefetch={false} href="/legal/dmca">DMCA</Link>
          <Link prefetch={false} href="/legal/accessibility">Accessibility</Link>
          <Link prefetch={false} href="/legal/about">About</Link>
          <Link prefetch={false} href="/legal/contact">Contact</Link>
        </nav>
      </div>
      <span className="muted small">© {new Date().getFullYear()} Ikarvo · Made for people who ship.</span>
    </footer>
  </div>;
}
