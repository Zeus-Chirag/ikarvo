'use client';
import React, { useEffect, useState } from 'react';
import { useWs, Pill, ErrorNote } from './ws';
import { api } from '@/lib/client/api';
import { createClient } from '@/lib/supabase/client';

export default function Billing() {
  const { status, store } = useWs();
  const [plan, setPlan] = useState<string>('free'); const [error, setError] = useState<unknown>(null); const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<{ plans: { id: string; name: string; price: string; blurb: string; perks: string[] }[]; configurable: string[] } | null>(null);
  useEffect(() => { fetch('/api/plans').then(r => r.json()).then(setInfo).catch(() => {}); }, []);
  const q = typeof window !== 'undefined' ? new URLSearchParams(location.search).get('checkout') : null;
  useEffect(() => { if (store.mode !== 'cloud') return; createClient().from('profiles').select('plan').maybeSingle().then(({ data }: { data: { plan?: string } | null }) => data?.plan && setPlan(data.plan)); }, [store.mode]);
  const go = async (path: string) => { setBusy(true); setError(null); try { const r = await api<{ url: string }>(path, {}); location.href = r.url; } catch (e) { setError(e); setBusy(false); } };
  const features = Object.entries(status).filter(([k]) => k !== 'preview') as [string, { ok: boolean; label: string; missing: string[]; note?: string }][];
  return <div className="page">
    <header className="page-head"><div><span className="kicker">Account</span><h1>Billing & setup</h1><p>Your plan, and a checklist of every service this workspace can use.</p></div></header>
    {q === 'success' && <div className="note ok"><div><strong>Payment received</strong><p>Your plan updates once Stripe&apos;s webhook reaches the server. Refresh in a moment.</p></div></div>}
    <div className="plans">
      {(info?.plans ?? []).map(p =>
        <article key={p.id} className={`card plan ${plan === p.id ? 'current' : ''}`}><div className="row between"><h3>{p.name}</h3>{plan === p.id && <span className="chip">Current</span>}</div><div className="price">{p.price}</div><p className="small muted">{p.blurb}</p><ul className="ticks">{p.perks.map(i => <li key={i}>{i}</li>)}</ul>
          {p.id === 'pro' && (plan === 'pro' ? <button className="btn wide" disabled={busy} onClick={() => go('/api/billing/portal')}>Manage subscription</button> : <button className="btn primary wide" disabled={busy || !status.stripe.ok} onClick={() => go('/api/billing/checkout')}>{status.stripe.ok ? 'Upgrade with Stripe' : 'Stripe not configured'}</button>)}</article>)}
    </div>
    <p className="small muted">Our own credits model. Names, monthly credits and the price label are placeholders you set: {info?.configurable.map(k => <code key={k}>{k}</code>).reduce<React.ReactNode[]>((a, c, i) => i ? [...a, ' ', c] : [c], [])}. The amount charged is whatever your Stripe price says. <a href="/app?view=settings&tab=credits">See what each action costs →</a></p>
    <ErrorNote error={error} onClose={() => setError(null)} />
    <h2 className="h2 spaced">Service checklist</h2>
    <div className="table">{features.map(([k, f]) => <div key={k} className="tr"><span>{f.label}</span><Pill ok={f.ok}>{f.ok ? 'Ready' : 'Missing'}</Pill><span className="small muted">{f.ok ? f.note ?? '' : f.missing.join(', ')}</span></div>)}
      <div className="tr"><span>Storage mode</span><Pill ok>{store.mode === 'cloud' ? 'Supabase' : 'Browser (preview)'}</Pill><span className="small muted">{status.preview ? 'PREVIEW_MODE=1: sign-in skipped, data in localStorage' : ''}</span></div></div>
    {!status.stripe.ok && <p className="small muted">Plan status is read from <code>profiles.plan</code>, which only the Stripe webhook writes.</p>}
  </div>;
}
