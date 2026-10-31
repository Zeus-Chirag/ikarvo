'use client';
import { useEffect, useState } from 'react';
import Icon from '../Icon';
import { useWs } from '../ws';
import { download } from '@/lib/client/api';
import { useBrand } from './useBrand';

/** Free utilities, all client-side: UTM builder, llms.txt, robots.txt, JSON-LD, meta length check. */
export default function Tools() {
  const { toast, store } = useWs(); const { brand } = useBrand();
  const [utm, setUtm] = useState({ url: '', source: 'x', medium: 'social', campaign: 'launch', content: '' });
  const [pages, setPages] = useState<{ url: string; title: string; description: string }[]>([]);
  const [meta, setMeta] = useState({ title: '', desc: '' });
  useEffect(() => { store.list<{ pages: { url: string; title: string; description: string }[] }>('crawls').then(l => setPages(l[0]?.data.pages ?? [])).catch(() => {}); if (brand?.url) setUtm(u => ({ ...u, url: u.url || brand.url })); }, [store, brand]);
  const utmUrl = (() => { try { const u = new URL(utm.url); Object.entries({ utm_source: utm.source, utm_medium: utm.medium, utm_campaign: utm.campaign, utm_content: utm.content }).forEach(([k, v]) => v && u.searchParams.set(k, v)); return u.toString(); } catch { return ''; } })();
  const name = brand?.docs?.product.name ?? 'Your product'; const site = brand?.url?.replace(/\/$/, '') ?? 'https://example.com';
  const llms = `# ${name}\n\n> ${brand?.docs?.product.oneLiner ?? 'One-line description.'}\n\n## Pages\n${(pages.length ? pages : [{ url: site, title: 'Home', description: '' }]).slice(0, 40).map(p => `- [${p.title || p.url}](${p.url})${p.description ? `: ${p.description}` : ''}`).join('\n')}\n`;
  const robots = `User-agent: *\nAllow: /\n\n# AI crawlers welcome\nUser-agent: GPTBot\nAllow: /\nUser-agent: PerplexityBot\nAllow: /\nUser-agent: ClaudeBot\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`;
  const schema = JSON.stringify({ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name, url: site, description: brand?.docs?.product.oneLiner ?? '', applicationCategory: brand?.docs?.product.category ?? 'BusinessApplication', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } }, null, 2);
  const Box = ({ title, text, file }: { title: string; text: string; file: string }) => <article className="card spaced"><div className="row between"><h3>{title}</h3><div className="row"><button className="btn ghost sm" onClick={() => { navigator.clipboard.writeText(text); toast('Copied'); }}><Icon name="copy" />Copy</button><button className="btn ghost sm" onClick={() => download(file, text, 'text/plain')}><Icon name="download" />{file}</button></div></div><pre className="code small">{text}</pre></article>;
  return <div className="growth">
    <section className="panel"><h2 className="h2">UTM builder</h2>
      {(['url', 'source', 'medium', 'campaign', 'content'] as const).map(k => <label key={k} className="label">{k}<input className="input" value={utm[k]} onChange={e => setUtm({ ...utm, [k]: e.target.value })} /></label>)}
      {utmUrl && <p className="small code">{utmUrl}</p>}<button className="btn sm" disabled={!utmUrl} onClick={() => { navigator.clipboard.writeText(utmUrl); toast('Link copied'); }}><Icon name="copy" />Copy link</button>
      <div className="divider" /><h2 className="h2">Meta length check</h2>
      <label className="label">Title · {meta.title.length}/60<input className="input" value={meta.title} onChange={e => setMeta({ ...meta, title: e.target.value })} /></label>
      <label className="label">Description · {meta.desc.length} (aim 120–160)<textarea rows={3} value={meta.desc} onChange={e => setMeta({ ...meta, desc: e.target.value })} /></label>
      <div className="seo-snip"><span className="small muted">{site}</span><b>{meta.title || 'Your title'}</b><span className="small">{meta.desc.slice(0, 160) || 'Your description'}</span></div>
      <p className={`small ${meta.title.length > 60 || (meta.desc && (meta.desc.length < 120 || meta.desc.length > 160)) ? 'err-text' : 'ok-text'}`}>{meta.title.length > 60 ? 'Title will be truncated.' : meta.desc && (meta.desc.length < 120 || meta.desc.length > 160) ? 'Description outside 120–160.' : 'Looks fine.'}</p></section>
    <section className="docs"><p className="small muted">{pages.length ? `llms.txt lists your ${pages.length} crawled pages.` : 'Run a site crawl to fill llms.txt with every page.'}</p>
      <Box title="llms.txt" text={llms} file="llms.txt" /><Box title="robots.txt" text={robots} file="robots.txt" /><Box title="JSON-LD (SoftwareApplication)" text={schema} file="schema.jsonld" /></section>
  </div>;
}
