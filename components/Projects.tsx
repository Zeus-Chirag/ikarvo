'use client';
import { useEffect, useState } from 'react';
import Icon from './Icon';
import { useWs, ErrorNote } from './ws';
import type { Doc } from '@/lib/client/store';
import { fmtDate } from '@/lib/client/api';

type P = { prompt: string; html: string; deployUrl?: string; repo?: string };
export default function Projects() {
  const { store, openProject, toast, go } = useWs();
  const [items, setItems] = useState<Doc<P>[] | null>(null); const [error, setError] = useState<unknown>(null);
  useEffect(() => { store.list<P>('projects').then(setItems).catch(e => { setError(e); setItems([]); }); }, [store]);
  async function remove(id: string) { try { await store.remove('projects', id); setItems(i => i?.filter(x => x.id !== id) ?? null); toast('Project deleted'); } catch (e) { setError(e); } }
  return <div className="page">
    <header className="page-head"><div><span className="kicker">Library</span><h1>Projects</h1><p>{store.mode === 'cloud' ? 'Synced to your account.' : 'Saved in this browser (preview mode).'}</p></div></header>
    <ErrorNote error={error} />
    {items && !items.length && <div className="blank"><h3>Nothing here yet</h3><p>Apps you generate are saved automatically.</p><button className="btn primary" style={{ marginTop: 16 }} onClick={() => go('build')}><Icon name="plus" />Build your first app</button></div>}
    {!items && <div className="grid3" aria-busy="true" aria-label="Loading projects">{[0, 1, 2].map(i => <div key={i} className="card project"><span className="sk" style={{ height: 170, borderRadius: 0 }} /><div className="card-body"><span className="sk sk-line" style={{ width: '60%' }} /><span className="sk sk-line" /><span className="sk sk-line" style={{ width: '40%' }} /></div></div>)}</div>}
    <div className="grid3 stagger">{items?.map(p => <article key={p.id} className="card project">
      <div className="thumb"><iframe title="" tabIndex={-1} sandbox="" srcDoc={p.data.html} /></div>
      <div className="card-body"><h3>{p.title}</h3><p className="muted small clamp">{p.data.prompt}</p>
        <div className="row between"><span className="small muted">{fmtDate(p.updated_at)}{p.data.deployUrl ? ' · deployed' : ''}</span>
          <div className="row"><button className="btn sm" onClick={() => openProject(p.id)}>Open</button><button className="btn ghost sm icon" aria-label={`Delete ${p.title}`} onClick={() => remove(p.id)}><Icon name="trash" /></button></div></div></div>
    </article>)}</div>
  </div>;
}
