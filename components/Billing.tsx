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
    <header className="page-head"><div><span className="kicker">Account</span><h1>Billing</h1><p>Your plan, credits and what is available in your workspace.</p></div></header>
    {q === 'success' && <div className="note ok"><div><strong>Payment received</strong><p>Your plan will update within a minute. Refresh this page if it hasn’t changed yet.</p></div></div>}
    <div className="plans">
      {(info?.plans ?? []).map(p =>
        <article key={p.id} className={`card plan ${plan === p.id ? 'current' : ''}`}><div className="row between"><h3>{p.name}</h3>{plan === p.id && <span className="chip">Current</span>}</div><div className="price">{p.price}</div><p className="small muted">{p.blurb}</p><ul className="ticks">{p.perks.map(i => <li key={i}>{i}</li>)}</ul>
          {p.id !== 'free' && (plan === p.id ? <button className="btn wide" disabled={busy} onClick={() => go('/api/billing/portal')}>Manage subscription</button> : (status.stripe.ok ? <button className="btn primary wide" disabled={busy} onClick={() => go('/api/billing/checkout')}>Upgrade</button> : <a className="btn wide" href="/pricing">Checkout coming soon · see plans</a>))}</article>)}
    </div>
    <p className="small muted">Every AI action uses a fixed number of credits, and failed actions are refunded automatically. <a href="/app?view=settings&tab=credits">See what each action costs →</a></p>
    <ErrorNote error={error} onClose={() => setError(null)} />
    <h2 className="h2 spaced">Available in your workspace</h2>
    <div className="table">{features.map(([k, f]) => <div key={k} className="tr"><span>{f.label}</span><Pill ok={f.ok}>{f.ok ? 'Ready' : 'Coming soon'}</Pill><span className="small muted" /></div>)}
      <div className="tr"><span>Storage mode</span><Pill ok>{store.mode === 'cloud' ? 'Supabase' : 'Browser (preview)'}</Pill><span className="small muted">{status.preview ? 'Data is stored in this browser' : 'Synced to your account'}</span></div></div>
  </div>;
}
