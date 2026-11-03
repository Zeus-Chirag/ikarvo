'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Plan, ADDONS } from '@/lib/plans';

type Props = { plans: Plan[]; addons: typeof ADDONS; checkout: boolean; contact: string; full?: boolean };
const ROWS: [string, (p: Plan) => string | boolean][] = [
  ['Monthly credits', p => p.credits.toLocaleString('en-US')],
  ['15s UGC videos included', p => p.videos ? `${p.videos} / mo` : p.id === 'free' ? false : 'Add-on packs'],
  ['AI CMO chat with memory & tools', () => true],
  ['Competitor, Reddit & HN discovery', () => true],
  ['SEO articles, backlinks & AI visibility', () => true],
  ['Ad Studio: scripts, copy & voiceover', () => true],
  ['AI music beds', p => p.id === 'pro' || p.id === 'agency'],
  ['Scheduled publishing & digests', p => p.id !== 'free'],
  ['Premium avatar videos', p => p.id === 'agency' ? true : p.id === 'free' ? false : 'Add-on'],
  ['Team seats & multiple workspaces', p => p.id === 'agency'],
  ['Failed actions refunded automatically', () => true],
];
const FAQ: [string, string][] = [
  ['What is a credit?', 'Every agent action has a fixed credit cost shown before you run it: a CMO chat message is 2 credits, a competitor scan 5, an SEO article 15, an AI music bed 35. If an action fails, its credits are refunded automatically.'],
  ['How do videos work?', 'Pro includes 2 and Agency 8 fifteen-second UGC videos a month (script, voiceover, b-roll, captions). Need more, or on Free/Starter? Buy a 5-video pack. Premium lip-synced avatar videos come in their own pack.'],
  ['Do unused credits roll over?', 'Plan credits reset on the 1st of each month. Add-on credits stay available while you are subscribed.'],
  ['Can I change or cancel my plan?', 'Yes, upgrade, downgrade or cancel any time from Billing. Annual plans are billed once a year at the discounted monthly rate.'],
  ['Is there a free plan?', 'Yes. Free gives you 150 credits every month to use every text and research agent on your own product, no card needed. Video rendering is not included on Free.'],
  ['When can I buy a paid plan?', 'Online checkout is opening shortly. Until then, contact us and we will set up your plan by hand.'],
];

function useSignedIn() {
  const [s, setS] = useState(false);
  useEffect(() => { try { createClient().auth.getSession().then(({ data }: { data: { session: unknown } }) => setS(!!data.session)); } catch { /* not configured */ } }, []);
  return s;
}

export default function Pricing({ plans, addons, checkout, contact, full = true }: Props) {
  const [annual, setAnnual] = useState(true); const signedIn = useSignedIn();
  const contactHref = contact ? `mailto:${contact}?subject=${encodeURIComponent('Ikarvo plan')}` : '/legal/contact';
  const cta = (p: Plan) => {
    if (p.id === 'free') return <Link prefetch={false} className="btn wide" href={signedIn ? '/app' : '/app?mode=up'}>{signedIn ? 'Open workspace' : 'Start free'}</Link>;
    if (!signedIn) return <Link prefetch={false} className={`btn wide ${p.popular ? 'primary' : ''}`} href={`/app?mode=up&plan=${p.id}`}>Get started</Link>;
    if (checkout) return <Link prefetch={false} className={`btn wide ${p.popular ? 'primary' : ''}`} href={`/app?view=billing&plan=${p.id}&cycle=${annual ? 'annual' : 'monthly'}`}>Upgrade to {p.name}</Link>;
    return <a className={`btn wide ${p.popular ? 'primary' : ''}`} href={contactHref}>Contact to upgrade</a>;
  };
  return <div className="pricing-wrap">
    <div className="cycle" role="group" aria-label="Billing period">
      <button type="button" className={!annual ? 'on' : ''} aria-pressed={!annual} onClick={() => setAnnual(false)}>Monthly</button>
      <button type="button" className={annual ? 'on' : ''} aria-pressed={annual} onClick={() => setAnnual(true)}>Annual <span className="save">Save 20%</span></button>
    </div>
    <div className="tiers">
      {plans.map(p => { const price = annual ? p.annual : p.monthly; return <article key={p.id} className={`card tier ${p.popular ? 'popular' : ''}`}>
        {p.popular && <span className="badge">Most popular</span>}
        <h3>{p.name}</h3>
        <div className="price">${price}<small>/mo</small></div>
        <p className="small muted bill">{p.monthly ? (annual ? `Billed $${p.annual * 12}/year` : 'Billed monthly') : 'Free forever'}</p>
        <p className="small muted">{p.blurb}</p>
        {cta(p)}
        <ul className="ticks">{p.perks.map(x => <li key={x}>{x}</li>)}</ul>
      </article>; })}
    </div>
    {!checkout && <p className="small muted center">Online checkout opens soon. Paid plans are set up on request in the meantime; the Free plan works today.</p>}
    {full && <>
      <h2 className="h2 spaced center">Add-ons</h2>
      <div className="addons">{addons.map(a => <div key={a.id} className="card addon"><div><b>{a.name}</b><p className="small muted">{a.detail}</p></div><div className="addon-price">${a.price}<small> one-time</small></div></div>)}</div>
      <h2 className="h2 spaced center">Compare plans</h2>
      <div className="cmp-scroll"><table className="cmp">
        <thead><tr><th scope="col">Feature</th>{plans.map(p => <th key={p.id} scope="col" className={p.popular ? 'pop' : ''}>{p.name}</th>)}</tr></thead>
        <tbody>{ROWS.map(([label, f]) => <tr key={label}><th scope="row">{label}</th>{plans.map(p => { const v = f(p); return <td key={p.id} className={p.popular ? 'pop' : ''}>{v === true ? <span className="yes" aria-label="Included">✓</span> : v === false ? <span className="no" aria-label="Not included">—</span> : v}</td>; })}</tr>)}</tbody>
      </table></div>
      <h2 className="h2 spaced center">Questions</h2>
      <div className="faq">{FAQ.map(([q, a]) => <details key={q} className="card"><summary>{q}</summary><p className="muted">{a}</p></details>)}</div>
    </>}
  </div>;
}
