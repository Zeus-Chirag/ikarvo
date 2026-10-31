'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import { FromNote, useWs, ErrorNote } from '../ws';
import { api, fmtDate } from '@/lib/client/api';
import { total, uid, type Project, type Scene } from './engine';
import { TEMPLATES, newProject, DEFAULT_BRAND } from './library';
import { useAssets } from './assets';
import Editor from './Editor';
import Ugc, { type Readiness } from './Ugc';
import StaticAds from './Static';
import Deliver from './Deliver';

type Tab = 'ugc' | 'launch' | 'static' | 'deliver';
const assetIds = (p: Project) => [p.brand.logo, p.music?.asset, p.voice?.asset, p.avatar?.asset, ...p.scenes.map(s => s.image)].filter((x): x is string => !!x);

export default function AdStudio() {
  const { store, toast, handoff, take } = useWs(); const A = useAssets();
  const [tab, setTab] = useState<Tab>('launch');
  useEffect(() => { const t = new URLSearchParams(location.search).get('tab'); if (t && ['ugc', 'launch', 'static', 'deliver'].includes(t)) setTab(t as Tab); }, []); const [ready, setReady] = useState<Readiness | null>(null);
  const [project, setP] = useState<Project | null>(null); const [saved, setSaved] = useState<{ id: string; title: string; updated_at: string; data: Project }[]>([]);
  const [rev, setRev] = useState(0); const [from, setFrom] = useState(''); const [seed, setSeed] = useState<{ product?: string; audience?: string }>(); const [err, setErr] = useState<unknown>(null); const [busy, setBusy] = useState(false);
  const brand = project?.brand ?? DEFAULT_BRAND;
  useEffect(() => { api<Readiness>('/api/ad/publish/status').then(setReady).catch(setErr); store.list<Project>('ad_projects').then(setSaved).catch(() => {}); }, [store]);
  useEffect(() => { if (handoff?.kind !== 'ad') return; const h = take('ad'); if (!h) return; setFrom(h.from); setSeed({ product: `${h.product ?? ''}\nAngle: ${h.angle}`.trim(), audience: h.audience }); setTab('ugc'); }, [handoff, take]);
  const setProject = useCallback((f: (p: Project) => Project) => setP(p => p && f(p)), []);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => { if (!project) return; clearTimeout(timer.current); timer.current = window.setTimeout(() => { store.save('ad_projects', { id: project.id, title: project.name, data: project }).then(d => setSaved(s => [d as typeof s[number], ...s.filter(x => x.id !== d.id)])).catch(() => {}); }, 1200); return () => clearTimeout(timer.current); }, [project, store]);
  const open = async (p: Project) => { await A.restore(assetIds(p)); setP(p); setTab('launch'); };
  async function draft() { if (!project) return; setBusy(true); setErr(null);
    try { const r = await api<{ concept: { motion: { headline: string; sub: string }[] } }>('/api/creative', { product: `${project.brand.name}. ${project.scenes.map(s => s.headline).join('. ')}`, format: 'Motion-graphic explainer', platform: project.aspect === '16:9' ? 'YouTube pre-roll' : 'TikTok / Reels', tone: 'Confident, specific, no hype' });
      const m = r.concept.motion ?? []; setProject(p => ({ ...p, scenes: p.scenes.map((s, i): Scene => m[i] ? { ...s, headline: m[i].headline, sub: s.template === 'cta' ? s.sub : m[i].sub } : s) })); toast('Scene copy rewritten; layouts and timing kept'); }
    catch (e) { setErr(e); } finally { setBusy(false); } }

  const TABS: [Tab, string, string][] = [['ugc', 'UGC ad', 'user'], ['launch', 'Launch video', 'film'], ['static', 'Static ads', 'image'], ['deliver', 'Deliver', 'upload']];
  return <div className="page studio">
    <header className="page-head"><div><span className="kicker">Ads</span><h1>Ad Studio</h1><p>Script, voice, actor, motion and export in one place. Video is rendered on your device; providers are only called when you connect them.</p></div></header>
    <nav className="tabs" role="tablist">{TABS.map(([k, l, i]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}><Icon name={i} />{l}</button>)}</nav>
    {from && <FromNote from={from} onClose={() => setFrom('')}>Brief prefilled in the UGC tab.</FromNote>}
    <ErrorNote error={err} onClose={() => setErr(null)} />
    {tab === 'ugc' && <Ugc A={A} brand={brand} ready={ready} seed={seed} key={seed?.product ?? 'u'} onCompose={p => { setP(p); setTab('launch'); toast('Composed. Fine-tune in the editor, then export.'); }} />}
    {tab === 'launch' && (!project ? <div className="gallery-wrap">
        <h2 className="h2">Start from a structure</h2><p className="muted small">Each template is a scene plan with placeholder copy. Replace it with your own product, screenshots and brand.</p>
        <div className="gallery">{TEMPLATES.map(t => { const sc = t.scenes(); const d = sc.reduce((a, s) => a + s.dur, 0);
          return <button key={t.id} className="tpl" onClick={() => setP(newProject(t.id, brand))}><div className={`tpl-thumb a${t.aspect.replace(':', '-')}`}>{sc.slice(0, 4).map(s => <i key={s.id} className={`t-${s.template}`} style={{ flex: s.dur }} />)}</div>
            <b>{t.name}</b><span className="small muted">{t.desc}</span><span className="small mono">{t.aspect} · {sc.length} scenes · {d.toFixed(0)}s</span></button>; })}</div>
        {!!saved.length && <><h2 className="h2">Your projects</h2><div className="saved">{saved.slice(0, 12).map(s => <div key={s.id} className="saved-row"><button className="plain" onClick={() => open(s.data)}><b>{s.title}</b><span className="small muted">{s.data.aspect} · {s.data.scenes.length} scenes · {total(s.data).toFixed(0)}s · {fmtDate(s.updated_at)}</span></button>
          <button className="btn ghost sm icon" aria-label="Delete project" onClick={async () => { await store.remove('ad_projects', s.id); setSaved(x => x.filter(y => y.id !== s.id)); }}><Icon name="trash" /></button></div>)}</div></>}
      </div> : <>
        <div className="studio-bar"><input className="input title-in" value={project.name} onChange={e => setProject(p => ({ ...p, name: e.target.value }))} aria-label="Project name" />
          <span className="small muted">Autosaved · media stays in this browser</span>
          <button className="btn ghost sm" disabled={busy} onClick={draft}>{busy ? <span className="spin" /> : <Icon name="spark" />}Rewrite copy with AI</button>
          <button className="btn ghost sm" onClick={() => setP({ ...project, id: uid(), name: `${project.name} copy` })}><Icon name="copy" />Duplicate</button>
          <button className="btn ghost sm" onClick={() => setP(null)}>All projects</button></div>
        <Editor project={project} setProject={setProject} assets={A} onRendered={() => setRev(r => r + 1)} /></>)}
    {tab === 'static' && <StaticAds A={A} brand={brand} onSaved={() => { setRev(r => r + 1); toast('Saved to Deliver'); }} />}
    {tab === 'deliver' && <Deliver ready={ready} rev={rev} />}
  </div>;
}
