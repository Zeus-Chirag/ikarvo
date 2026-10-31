'use client';
import { useEffect, useState } from 'react';
import Icon from '../Icon';
import { useWs, ErrorNote } from '../ws';
import { api, download } from '@/lib/client/api';
import type { Doc } from '@/lib/client/store';
import { useBrand, briefFor } from './useBrand';

type Email = { day: number; trigger: string; subjectA: string; subjectB: string; preview: string; body: string; cta: string; job: string };
type Seq = { kind: string; goal: string; audience: string; emails: Email[]; metrics: string[]; exitRule: string };
const KINDS = [['onboarding', 'Onboarding'], ['trial', 'Trial → paid'], ['nurture', 'Lead nurture'], ['winback', 'Win-back'], ['launch', 'Launch announcement']] as const;
/** Lifecycle email sequences: timing, triggers, A/B subjects; export as CSV (ESP import) or Markdown. */
export default function Lifecycle() {
  const { store, toast } = useWs(); const { brand } = useBrand();
  const [kind, setKind] = useState<string>('onboarding'); const [activation, setActivation] = useState(''); const [count, setCount] = useState(5); const [notes, setNotes] = useState('');
  const [list, setList] = useState<Doc<Seq>[]>([]); const [cur, setCur] = useState<Doc<Seq> | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(null); const [open, setOpen] = useState(0);
  useEffect(() => { store.list<Seq>('sequences').then(l => { setList(l); setCur(l[0] ?? null); }).catch(() => {}); }, [store]);
  async function gen() { setBusy(true); setError(null); try { const r = await api<{ result: Omit<Seq, 'kind'> }>('/api/growth/sequence', { kind, activation, count, notes, brief: briefFor(brand, 'articles') }); const d = await store.save<Seq>('sequences', { title: `${KINDS.find(k => k[0] === kind)?.[1]} sequence`, data: { kind, ...r.result } }); setList(l => [d, ...l]); setCur(d); setOpen(0); toast('Sequence ready'); } catch (e) { setError(e); } finally { setBusy(false); } }
  const s = cur?.data;
  const csv = () => s && download('sequence.csv', ['day,trigger,subject_a,subject_b,preview,body,cta', ...s.emails.map(e => [e.day, e.trigger, e.subjectA, e.subjectB, e.preview, e.body, e.cta].map(x => `"${String(x).replace(/"/g, '""')}"`).join(','))].join('\n'), 'text/csv');
  const md = () => s && download('sequence.md', `# ${cur?.title}\n\nGoal: ${s.goal}\nAudience: ${s.audience}\nExit: ${s.exitRule}\n\n${s.emails.map((e, i) => `## ${i + 1}. Day ${e.day}: ${e.subjectA}\n_Alt subject:_ ${e.subjectB}\n_Preview:_ ${e.preview}\n_Trigger:_ ${e.trigger}\n\n${e.body}\n\nCTA: ${e.cta}`).join('\n\n')}`, 'text/markdown');
  return <div className="growth">
    <section className="panel"><h2 className="h2">Lifecycle emails</h2>
      <p className="small muted">Sequences that turn sign-ups into active users. Export to any email tool (CSV/Markdown). Nothing is sent from here.</p>
      <span className="label">Sequence</span><div className="seg wide wrap">{KINDS.map(([k, l]) => <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{l}</button>)}</div>
      <label className="label">Activation event (the action that predicts retention)<input className="input" value={activation} placeholder="e.g. connected a bank account" onChange={e => setActivation(e.target.value)} /></label>
      <label className="label">Emails<input className="input" type="number" min={3} max={7} value={count} onChange={e => setCount(Number(e.target.value))} /></label>
      <label className="label">Notes<textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Offer, tone, what to avoid" /></label>
      <button className="btn primary wide" disabled={busy} onClick={gen}>{busy ? <><span className="spin" />Writing…</> : 'Write sequence · 6 cr'}</button>
      <ErrorNote error={error} onClose={() => setError(null)} />
      {list.length > 1 && <><span className="label">Saved</span>{list.map(l => <button key={l.id} className={`btn ghost sm wide ${cur?.id === l.id ? 'on' : ''}`} onClick={() => setCur(l)}>{l.title}</button>)}</>}
    </section>
    <section className="docs">{!s ? <div className="blank"><h3>Write the emails people actually open</h3><p>Each email gets one job, a send day, a trigger and two subject lines to test.</p></div> : <>
      <div className="row between"><div><h3>{cur?.title}</h3><p className="small muted">{s.goal} · exit: {s.exitRule}</p></div><div className="row"><button className="btn ghost sm" onClick={csv}><Icon name="download" />CSV</button><button className="btn ghost sm" onClick={md}><Icon name="download" />Markdown</button></div></div>
      <div className="seq">{s.emails.map((e, i) => <article key={i} className={`card seq-mail ${open === i ? 'open' : ''}`} onClick={() => setOpen(i)}>
        <div className="row between"><span className="chip">Day {e.day}</span><span className="small muted">{e.trigger}</span></div>
        <h3>{e.subjectA}</h3><p className="small muted">B: {e.subjectB} · {e.preview}</p>
        {open === i && <><p className="pre">{e.body}</p><p className="small"><b>CTA:</b> {e.cta} · <b>Job:</b> {e.job}</p><button className="btn ghost sm" onClick={ev => { ev.stopPropagation(); navigator.clipboard.writeText(`Subject: ${e.subjectA}\n\n${e.body}`); toast('Copied'); }}><Icon name="copy" />Copy</button></>}
      </article>)}</div>
      <p className="small muted">Track: {s.metrics.join(' · ')}</p></>}</section>
  </div>;
}
