'use client';
import { useEffect, useState } from 'react';
import Icon from '../Icon';
import { ErrorNote, useWs } from '../ws';
import { api } from '@/lib/client/api';

export type MetaAccount = { configured: boolean; missing: string[]; connected: boolean; reason?: string; source?: 'oauth' | 'env'; user?: string; scopes?: string[]; expiresAt?: string | null;
  selected?: { adAccountId: string | null; adAccountName: string | null; currency: string | null; pageId: string | null; pageName: string | null };
  adAccounts?: { id: string; name: string; status: string; active: boolean; currency: string; timezone: string; business: string | null }[]; pages?: { id: string; name: string; category?: string }[] };

export function useMetaAccount() {
  const [a, setA] = useState<MetaAccount | null>(null); const [err, setErr] = useState<unknown>(null);
  const load = () => fetch('/api/meta/account', { cache: 'no-store' }).then(async r => { const d = await r.json(); if (!r.ok) throw Object.assign(new Error(d.error), { setup: d.setup }); setA(d); }).catch(setErr);
  useEffect(() => { load(); }, []);
  return { account: a, error: err, setError: setErr, reload: load };
}

const ago = (iso?: string | null) => { if (!iso) return 'never expires'; const d = Math.round((new Date(iso).getTime() - Date.now()) / 864e5); return d > 0 ? `token valid ${d} more days` : 'token expired'; };

/** Integrations → Paid ads → Meta Ads: OAuth connect, ad account + Page picker, disconnect (revokes at Meta). */
export default function MetaConnect() {
  const { toast } = useWs(); const { account: a, error, setError, reload } = useMetaAccount();
  const [acct, setAcct] = useState(''); const [page, setPage] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { if (a?.selected) { setAcct(a.selected.adAccountId ?? a.adAccounts?.find(x => x.active)?.id ?? ''); setPage(a.selected.pageId ?? a.pages?.[0]?.id ?? ''); } }, [a]);
  const save = async () => { setBusy(true); try { const r = await api<{ adAccountName: string }>('/api/meta/account', { adAccountId: acct, pageId: page }); toast(`Ads will run from ${r.adAccountName}`); reload(); } catch (e) { setError(e); } finally { setBusy(false); } };
  const off = async () => { setBusy(true); try { const r = await api<{ revoked: boolean }>('/api/meta/disconnect', {}); toast(`Meta Ads disconnected${r.revoked ? ' and access revoked' : ''}`); reload(); } catch (e) { setError(e); } finally { setBusy(false); } };
  const state = !a ? 'checking' : !a.configured ? 'setup' : !a.connected ? 'connect' : !a.selected?.adAccountId ? 'pick' : 'ready';
  return <section className="int-sec meta-int">
    <div className="int-head"><h2 className="h2">Paid ads</h2><p className="small muted">Used by the AI CMO → Marketing → Meta Ads</p><span className="small muted">{state === 'ready' ? '1/1 ready' : '0/1 ready'}</span></div>
    <div className="meta-card">
      <div className="meta-card-id"><span className="meta-glyph" aria-hidden>∞</span><div><b>Meta Ads</b><span className="small muted">Facebook &amp; Instagram · Marketing API {`(Graph)`}</span></div>
        <span className={`pill ${state === 'ready' ? 'on' : state === 'setup' ? 'off' : 'warn'}`}><i />{{ checking: 'Checking…', setup: 'Not configured', connect: 'Not connected', pick: 'Pick an ad account', ready: 'Connected' }[state]}</span></div>
      <div className="meta-scopes">{['ads_management', 'ads_read', 'business_management'].map(s => <code key={s} className={a?.scopes?.includes(s) ? 'on' : ''}>{a?.scopes?.includes(s) && <Icon name="check" size={11} />}{s}</code>)}</div>
      {state === 'setup' && <div className="note setup"><div><strong>Add your Meta app credentials</strong><p>Missing {a!.missing.map(k => <code key={k}>{k}</code>).reduce<React.ReactNode[]>((x, y, i) => (i ? [...x, ', ', y] : [y]), [])}. Create an app at developers.facebook.com (type Business), add Marketing API, set the redirect URI to <code>/api/meta/callback</code>, then restart.</p></div></div>}
      {state === 'connect' && <div className="meta-cta"><p className="small muted">Sign in with Facebook and choose which business assets Ikarvo can manage. The token is sealed (AES-256-GCM) and stored for this workspace in Supabase.{a?.reason ? ` ${a.reason}` : ''}</p><a className="btn primary" href="/api/meta/connect"><Icon name="plug" />Connect with Facebook</a></div>}
      {(state === 'pick' || state === 'ready') && a && <div className="meta-pick">
        <p className="small muted">Signed in as <b>{a.user}</b>{a.source === 'env' ? ' (server token)' : ` · ${ago(a.expiresAt)}`}</p>
        <div className="two"><label className="label">Ad account<select className="input" value={acct} onChange={e => setAcct(e.target.value)}><option value="">Choose…</option>{a.adAccounts?.map(x => <option key={x.id} value={x.id} disabled={!x.active}>{x.name} · {x.currency}{x.business ? ` · ${x.business}` : ''}{x.active ? '' : ` (${x.status})`}</option>)}</select></label>
          <label className="label">Facebook Page the ads run as<select className="input" value={page} onChange={e => setPage(e.target.value)}><option value="">Choose…</option>{a.pages?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div>
        {!a.adAccounts?.length && <p className="small warn-text">This login can see no ad accounts. Add yourself to one in Business Settings → Accounts → Ad accounts.</p>}
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn primary sm" disabled={busy || !acct || (acct === a.selected?.adAccountId && page === (a.selected?.pageId ?? ''))} onClick={save}>{state === 'ready' ? 'Save changes' : 'Use this account'}</button>
          {state === 'ready' && <a className="btn ghost sm" href="/app?view=marketing&tab=meta">Open in AI CMO →</a>}
          {a.source === 'oauth' && <button className="btn ghost sm" disabled={busy} onClick={off}>Disconnect</button>}
        </div></div>}
    </div>
    <ErrorNote error={error} onClose={() => setError(null)} />
  </section>;
}
