import { plans } from '@/lib/plans';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import Icon from '@/components/Icon';
import LandingMotion from '@/components/LandingMotion';
export const dynamic = 'force-dynamic';

const STEPS = [
  { n: '01', t: 'Build', h: 'Describe it. Watch it run.', p: 'Write what you want in plain language. Ikarvo writes a complete, working app and runs it in a sandboxed live preview on desktop, tablet and phone. Then keep talking to it until it’s right.', v: 'build' },
  { n: '02', t: 'Ship', h: 'Your repo. Your Vercel. One click.', p: 'Connect GitHub with OAuth and every version commits to a repo you own. Deploy to Vercel through its API and get a live URL. Stripe checkout handles billing on your side.', v: 'ship' },
  { n: '03', t: 'Advertise', h: 'Scripts, motion and footage.', p: 'Turn the product into UGC scripts with hooks and shot lists. Render motion-graphic and launch ads right in the browser and export them as video. Add AI footage from Replicate or fal when you need it.', v: 'ads' },
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
const PH_LOGOS = ['Northwind', 'Acme Labs', 'Globex', 'Initech', 'Umbrella', 'Hooli', 'Stark & Co', 'Wayne Studio'];

export default function Landing() {
  return <div className="landing"><LandingMotion />
    <nav className="lnav" aria-label="Main"><Link href="/" className="wordmark">Ikar<em>vo</em></Link>
      <div className="lnav-links"><a href="#how">Product</a><a href="#features">Features</a><a href="#pricing">Pricing</a><ThemeToggle /><Link prefetch={false} href="/app" className="btn primary">Open workspace</Link></div></nav>

    <header className="hero">
      <a href="#how" className="hero-badge"><b>New</b>Meta Ads from your Ad Studio renders <span aria-hidden>→</span></a>
      <h1 className="display" aria-label="Build the product. Then sell it."><span aria-hidden><span className="w">Build</span> <span className="w">the</span> <span className="w">product.</span><br /><span className="w"><em>Then</em></span> <span className="w">sell</span> <span className="w">it.</span></span></h1>
      <p className="lede">Ikarvo takes a prompt and gives you a working app, a GitHub repo, a live deployment, ads to promote it and a launch plan to market it. One workspace instead of six tabs.</p>
      <div className="row center-row"><Link prefetch={false} href="/app" className="btn primary lg">Start building, free</Link><a href="#how" className="btn ghost lg">See how it works</a></div>
      <p className="hero-note">No card needed · Works without keys in preview</p>
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

    <section className="proof" aria-label="Customer logos (placeholder)">
      <span className="proof-lab">Trusted by teams at <span className="ph-tag">Placeholder logos</span></span>
      <div className="marquee" aria-hidden><div>{[...PH_LOGOS, ...PH_LOGOS].map((l, i) => <span key={i}>{l}</span>)}</div></div>
    </section>

    <section id="how" className="steps">{STEPS.map(s => <article key={s.n} className="step reveal">
      <div className="step-n"><span>{s.n}</span>{s.t}</div>
      <div className="step-copy"><h2 className="display">{s.h}</h2><p>{s.p}</p></div>
      <Vignette v={s.v} />
    </article>)}</section>

    <section id="features" className="feats">
      <div className="feats-head reveal"><div><span className="kicker">Everything in one place</span><h2 className="display">Six tools, one brief.</h2></div><p>Each part reads the same product brief, so the app, the ads and the posts all say the same thing.</p></div>
      <div className="feat-grid reveal">{FEATS.map(([ic, t, d]) => <article key={t} className="feat"><span className="ic"><Icon name={ic} /></span><h3>{t}</h3><p>{d}</p></article>)}</div>
    </section>

    <section className="quotes" aria-label="Testimonials (placeholder)">
      <div className="quotes-head reveal"><h2 className="display">What builders say.</h2><span className="ph-tag">Placeholder: replace with real quotes</span></div>
      <div className="quote-grid reveal">{[['“Your customer quote goes here. Keep it to one specific result.”', 'Name, role · Company'], ['“A second quote about shipping speed or the ads it made.”', 'Name, role · Company'], ['“A third quote about the AI CMO or Meta Ads.”', 'Name, role · Company']].map(([q, a]) => <figure key={q} className="qcard"><p>{q}</p><footer><i />{a}</footer></figure>)}</div>
    </section>

    <section id="honest" className="honest reveal">
      <h2 className="display">No mock buttons.</h2>
      <p className="lede">Every connection either works or tells you exactly which key it needs. Here’s what runs on day one and what turns on when you add credentials.</p>
      <div className="honest-grid">
        <div><h3>Works without any keys</h3><ul className="ticks"><li>Live preview, code view, HTML export</li><li>Motion-graphic & launch ads, exported as video</li><li>Content calendar with .ics / .csv export</li><li>Projects, campaigns and posts saved</li></ul></div>
        <div><h3>Turns on with your keys</h3><ul className="ticks"><li>AI app, ad & copy generation: any OpenAI-compatible API</li><li>GitHub OAuth + repo push · Vercel deploy</li><li>Stripe subscriptions · Supabase accounts</li><li>Replicate or fal for image & video · Meta Ads</li></ul></div>
      </div>
    </section>

    <section id="pricing" className="pricing reveal">
      <h2 className="display">Pay for what the agents do.</h2>
      <p className="muted center">Both plans include every feature. Plans differ only in monthly credits; each AI action has a fixed credit cost, and failed calls are refunded.</p>
      <div className="plans">
        {plans().plans.map(p => <article key={p.id} className={`card plan ${p.id === 'pro' ? 'current' : ''}`}><h3>{p.name}</h3><div className="price">{p.price}</div><p className="small muted">{p.blurb}</p><ul className="ticks">{p.perks.map(x => <li key={x}>{x}</li>)}</ul><Link prefetch={false} className={`btn wide ${p.id === 'pro' ? 'primary' : ''}`} href={p.id === 'pro' ? '/app?view=billing' : '/app'}>{p.id === 'pro' ? 'Upgrade' : 'Start free'}</Link></article>)}
      </div>
      <p className="small muted center">Plan names, credit amounts and the price label are placeholders set by the operator (<code>CREDITS_*_MONTHLY</code>, <code>PLAN_*</code>); the charged amount always comes from the Stripe price.</p>
    </section>

    <section className="cta reveal"><div><h2 className="display">Ship it <em>today.</em></h2><p>Describe the product. Ikarvo builds it, deploys it and writes the launch.</p><div className="row center-row"><Link prefetch={false} href="/app" className="btn primary lg">Open workspace</Link><a href="#pricing" className="btn ghost lg">See pricing</a></div></div></section>

    <footer className="lfoot"><span className="wordmark">Ikar<em>vo</em></span><nav aria-label="Footer"><a href="#how">Product</a><a href="#features">Features</a><a href="#pricing">Pricing</a><Link prefetch={false} href="/app">Sign in</Link></nav><span className="muted small">© {new Date().getFullYear()} Ikarvo · Made for people who ship.</span></footer>
  </div>;
}
