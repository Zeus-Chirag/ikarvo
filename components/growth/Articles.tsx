'use client';
import { useEffect, useState } from 'react';
import Icon from '../Icon';
import { useWs, ErrorNote, Pill, FromNote, Acts } from '../ws';
import { api, download, fmtDate } from '@/lib/client/api';
import type { Doc } from '@/lib/client/store';
import { mdToHtml } from '@/lib/markdown';
import { useBrand, briefFor } from './useBrand';

type Article = { title: string; slug: string; metaDescription: string; keyword: string; outline: string[]; markdown: string; faqSchema: { q: string; a: string }[]; published?: { where: string; url: string }[] };

export default function Articles() {
  const { store, toast, status, handoff, take, act } = useWs(); const [from, setFrom] = useState(''); const { brand } = useBrand();
  const [topic, setTopic] = useState(''); const [angle, setAngle] = useState(''); const [words, setWords] = useState(1200);
  const [list, setList] = useState<Doc<Article>[]>([]); const [cur, setCur] = useState<Doc<Article> | null>(null);
  const [busy, setBusy] = useState(''); const [error, setError] = useState<unknown>(null); const [repo, setRepo] = useState(''); const [dir, setDir] = useState('content/blog'); const [view, setView] = useState<'read' | 'md'>('read');
  useEffect(() => { store.list<Article>('articles').then(l => { setList(l); setCur(l[0] ?? null); }).catch(() => {}); }, [store]);

  useEffect(() => { if (handoff?.kind !== 'article') return; const h = take('article'); if (h) { setFrom(h.from); setTopic(h.topic); setAngle(h.angle ?? ''); } }, [handoff, take]);
  async function write() {
    setBusy('write'); setError(null);
    try { const r = await api<{ result: Article }>('/api/growth/article', { topic, angle, words, brief: briefFor(brand, 'articles') }); const d = await store.save<Article>('articles', { title: r.result.title, data: r.result }); setList(l => [d, ...l]); setCur(d); toast('Draft ready'); }
    catch (e) { setError(e); } finally { setBusy(''); }
  }
  const frontmatter = (a: Article) => `---\ntitle: "${a.title.replace(/"/g, '\\"')}"\ndescription: "${a.metaDescription.replace(/"/g, '\\"')}"\nslug: ${a.slug}\nkeyword: "${a.keyword}"\ndate: ${new Date().toISOString().slice(0, 10)}\n---\n\n${a.markdown}`;
  const [cms, setCms] = useState<Record<string, { label: string; ok: boolean; missing: string[] }>>({}); const [target, setTarget] = useState('wordpress');
  useEffect(() => { fetch('/api/publish/status').then(r => r.json()).then(d => setCms(d.cms ?? {})).catch(() => {}); }, []);
  function framerCsv(a: Article) { const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
    download(`${a.slug}-framer.csv`, ['Title,Slug,Meta Description,Keyword,Date,Content', [a.title, a.slug, a.metaDescription, a.keyword, new Date().toISOString().slice(0, 10), mdToHtml(a.markdown)].map(q).join(',')].join('\n'), 'text/csv'); toast('CSV ready: import it into a Framer CMS collection'); }
  async function publish(where: string) {
    if (!cur) return; setBusy(where); setError(null);
    try {
      const r = where !== 'github' ? await api<{ url: string }>(`/api/publish/cms/${where}`, { title: cur.data.title, markdown: cur.data.markdown, excerpt: cur.data.metaDescription, slug: cur.data.slug })
        : await api<{ url: string }>('/api/publish/github', { repo, dir, slug: cur.data.slug, content: frontmatter(cur.data) });
      const d = await store.save<Article>('articles', { id: cur.id, title: cur.title, data: { ...cur.data, published: [...(cur.data.published ?? []), { where, url: r.url }] } }); setCur(d); setList(l => l.map(x => x.id === d.id ? d : x));
      toast(where === 'github' ? 'Committed to GitHub' : `Saved as a ${cms[where]?.label ?? where} draft`);
    } catch (e) { setError(e); } finally { setBusy(''); }
  }
  return <div className="growth">
    <section className="panel">
      {from && <FromNote from={from} onClose={() => setFrom('')}>Topic{angle ? ' and angle' : ''} prefilled. Write the draft when ready.</FromNote>}
      <h2 className="h2">New article</h2>
      <label className="label">Topic or target keyword<input className="input" value={topic} onChange={e => setTopic(e.target.value)} list="kw" placeholder="how to send invoices as a freelancer" />
        <datalist id="kw">{brand?.docs?.keywords.map(k => <option key={k.keyword} value={k.keyword} />)}</datalist></label>
      {!!brand?.docs?.keywords.length && <div className="chips">{brand.docs.keywords.slice(0, 6).map(k => <button key={k.keyword} className="chip btnchip" onClick={() => setTopic(k.keyword)}>{k.keyword}</button>)}</div>}
      <label className="label">Angle (optional)<input className="input" value={angle} onChange={e => setAngle(e.target.value)} placeholder="Opinionated guide from someone who's done it" /></label>
      <label className="label">Length · {words} words<input type="range" min={600} max={2500} step={100} value={words} onChange={e => setWords(Number(e.target.value))} /></label>
      <button className="btn primary wide" disabled={!!busy || topic.trim().length < 4} onClick={write}>{busy === 'write' ? <><span className="spin" />Writing draft…</> : 'Write article draft'}</button>
      {!status.ai.ok && <p className="small muted">Writing needs <code>AI_API_KEY</code>.</p>}
      <ErrorNote error={error} onClose={() => setError(null)} />
      {!!list.length && <><div className="divider" /><span className="label">Drafts</span>{list.map(a => <button key={a.id} className={`starter ${cur?.id === a.id ? 'sel' : ''}`} onClick={() => setCur(a)}><span>{a.title}</span><span className="small muted">{fmtDate(a.updated_at)}</span></button>)}</>}
    </section>
    <section className="docs">
      {!cur ? <div className="blank"><h3>Articles grounded in your brief</h3><p>Answer-first structure, FAQs and schema for search and AI assistants. Publish as a WordPress draft or commit Markdown to your site&apos;s repo.</p></div> : <article className="card article">
        <div className="row between"><div className="seg">{(['read', 'md'] as const).map(v => <button key={v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>{v === 'read' ? 'Preview' : 'Markdown'}</button>)}</div>
          <div className="row"><button className="btn ghost sm" onClick={() => { navigator.clipboard.writeText(cur.data.markdown); toast('Markdown copied'); }}><Icon name="copy" />Copy</button><button className="btn ghost sm" onClick={() => download(`${cur.data.slug}.md`, frontmatter(cur.data), 'text/markdown')}><Icon name="download" />.md</button></div></div>
        <div className="seo-snip"><span className="small muted">/{cur.data.slug}</span><b>{cur.data.title}</b><span className="small">{cur.data.metaDescription}</span></div>
        {view === 'read' ? <div className="prose" dangerouslySetInnerHTML={{ __html: mdToHtml(cur.data.markdown) }} /> : <pre className="code">{cur.data.markdown}</pre>}
        <div className="nextbar"><span>Distribute it</span><Acts items={[
          ['Turn into posts', async () => { const link = cur.data.published?.[0]?.url ?? ''; const d = new Date(Date.now() + 864e5); d.setHours(10, 0, 0, 0); const saved = [];
            for (const [ch, text] of [['X', `${cur.data.title}\n\n${cur.data.metaDescription} ${link}`.slice(0, 280)], ['LinkedIn', `${cur.data.title}\n\n${cur.data.metaDescription}\n\n${cur.data.outline.slice(0, 4).map(o => `• ${o}`).join('\n')}\n\n${link}`]] as const) { saved.push(await store.save('posts', { title: `${ch} post`, data: { channel: ch, when: new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16), at: d.toISOString(), text, hashtags: [], approved: false } })); d.setDate(d.getDate() + 1); }
            toast(`${saved.length} posts drafted in your calendar (approve them to schedule)`); act({ kind: 'tab', tab: 'calendar', from: 'Articles' }); }],
          ['Make an ad for this', () => act({ kind: 'ad', angle: `${cur.data.title}: ${cur.data.metaDescription}`, from: 'Articles' })],
          ['Build a landing page for this keyword', () => act({ kind: 'build', prompt: `A landing page targeting "${cur.data.keyword}". Hero answers the query in one sentence, then benefits, how it works, FAQ (${cur.data.faqSchema.map(f => f.q).slice(0, 4).join('; ')}) with FAQ schema, and a sign-up CTA.\n\n${briefFor(brand).slice(0, 1000)}`, from: 'Articles' })]]} /></div>
        <div className="divider" />
        <span className="label">Publish</span>
        <div className="pub"><div><div className="row between"><b>CMS draft</b><Pill ok={!!cms[target]?.ok}>{cms[target]?.ok ? 'Configured' : 'Not configured'}</Pill></div>
          <select className="input" value={target} onChange={e => setTarget(e.target.value)}>{Object.entries(cms).map(([k, c]) => <option key={k} value={k}>{c.label}{c.ok ? '' : ' (not set up)'}</option>)}</select>
          <p className="small muted">Always creates a <b>draft</b> for review in {cms[target]?.label ?? 'your CMS'}.{!cms[target]?.ok && cms[target] ? ` Needs ${cms[target].missing.join(', ')}.` : ''}</p>
          <div className="row"><button className="btn sm" disabled={!!busy} onClick={() => publish(target)}>{busy === target ? 'Sending…' : 'Send as draft'}</button><button className="btn ghost sm" title="Framer has no publishing API; import this CSV into a CMS collection" onClick={() => framerCsv(cur.data)}>Framer CSV</button></div></div>
          <div><div className="row between"><b>GitHub</b><Pill ok={status.github.ok}>{status.github.ok ? 'Available' : 'Not configured'}</Pill></div><div className="two"><input className="input" placeholder="owner/site-repo" value={repo} onChange={e => setRepo(e.target.value)} /><input className="input" value={dir} onChange={e => setDir(e.target.value)} /></div><button className="btn sm" disabled={!!busy || !repo} onClick={() => publish('github')}>{busy === 'github' ? 'Committing…' : 'Commit Markdown'}</button></div></div>
        {cur.data.published?.map((p, i) => <p key={i} className="small"><Icon name="check" size={12} /> {p.where}: <a className="link" href={p.url} target="_blank" rel="noreferrer">{p.url}</a></p>)}
      </article>}
    </section>
  </div>;
}
