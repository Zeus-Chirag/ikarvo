'use client';
import { useEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import { ErrorNote } from '../ws';
import { api } from '@/lib/client/api';
import { loadFont, resolveFont, uid, type Assets, type Brand } from './engine';
import { STATIC_SIZES, type StaticLayout } from './library';
import { idbPut, type AssetApi } from './assets';
import type { SavedRender } from './Editor';

type Ad = { layout: StaticLayout; headline: string; sub: string; cta: string; items: string[]; image?: string; tone: 'light' | 'dark' | 'accent'; badge: string };
type Variant = { platform: string; angle: string; primary?: string; headline?: string; description?: string; cta: string; over: string[] };

function lines(ctx: CanvasRenderingContext2D, text: string, max: number) { const out: string[] = []; let l = ''; for (const w of text.split(/\s+/).filter(Boolean)) { const t = l ? `${l} ${w}` : w; if (ctx.measureText(t).width > max && l) { out.push(l); l = w; } else l = t; } if (l) out.push(l); return out; }
function fit(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, max: number, maxLines: number, start: number) { let px = start; for (; px > 18; px -= 2) { ctx.font = font(px); if (lines(ctx, text, max).length <= maxLines) break; } ctx.font = font(px); return { px, ls: lines(ctx, text, max) }; }

export function drawStatic(ctx: CanvasRenderingContext2D, W: number, H: number, ad: Ad, b: Brand, assets: Assets) {
  const disp = resolveFont(b.display), body = resolveFont(b.body); const u = Math.min(W, H) / 100;
  const bg = ad.tone === 'dark' ? '#121212' : ad.tone === 'accent' ? b.accent : b.bg; const fg = ad.tone === 'light' ? b.fg : '#ffffff'; const acc = ad.tone === 'accent' ? b.fg : b.accent;
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); const img = ad.image ? assets.get(ad.image)?.el : undefined; const landscape = W / H > 1.4;
  const cover = (x: number, y: number, w: number, h: number, r = 0) => { if (!img) { ctx.fillStyle = 'rgba(127,127,127,.18)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); ctx.fillStyle = fg; ctx.globalAlpha = 0.5; ctx.font = `500 ${u * 3}px ${body}`; ctx.textAlign = 'center'; ctx.fillText('Product image', x + w / 2, y + h / 2); ctx.textAlign = 'left'; ctx.globalAlpha = 1; return; }
    const e = img as HTMLImageElement & HTMLVideoElement; const iw = e.videoWidth || e.naturalWidth, ih = e.videoHeight || e.naturalHeight; const s = Math.max(w / iw, h / ih); ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.clip(); ctx.drawImage(img, x + (w - iw * s) / 2, y + (h - ih * s) / 2, iw * s, ih * s); ctx.restore(); };
  const pad = u * 7; const x = pad; let y = pad, tw = W - pad * 2, th = H - pad * 2;
  if (ad.layout === 'headline' && img) { cover(0, 0, W, H); const g = ctx.createLinearGradient(0, H * 0.25, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.78)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  if (ad.layout === 'product') { const ih = landscape ? H : H * 0.52; if (landscape) { cover(W * 0.5, 0, W * 0.5, H); tw = W * 0.5 - pad * 2; } else { cover(pad, pad, W - pad * 2, ih - pad, u * 3); y = ih + u * 3; th = H - y - pad; } }
  if (ad.layout === 'split') { if (landscape || W / H > 0.9) { cover(W / 2, 0, W / 2, H); tw = W / 2 - pad * 2; } else { cover(0, H * 0.55, W, H * 0.45); th = H * 0.55 - pad * 1.5; } }
  const light = ad.layout === 'headline' && img ? '#fff' : fg;
  // badge + logo
  ctx.textBaseline = 'top'; const logo = b.logo ? assets.get(b.logo)?.el : undefined;
  if (logo) { const e = logo as HTMLImageElement; const lh = u * 6; ctx.drawImage(logo, x, y, lh * (e.naturalWidth / e.naturalHeight || 1), lh); } else { ctx.fillStyle = light; ctx.font = `700 ${u * 4}px ${disp}`; ctx.fillText(b.name, x, y); }
  if (ad.badge) { ctx.font = `600 ${u * 2.6}px ${body}`; const bw = ctx.measureText(ad.badge).width + u * 4; ctx.fillStyle = acc; ctx.beginPath(); ctx.roundRect(x + tw - bw, y, bw, u * 5.4, u * 2.7); ctx.fill(); ctx.fillStyle = ad.tone === 'accent' ? b.bg : '#fff'; ctx.fillText(ad.badge, x + tw - bw + u * 2, y + u * 1.3); }
  // text block bottom-anchored
  const ctaH = u * 8.5; const headText = ad.layout === 'quote' ? `“${ad.headline}”` : ad.headline; const hw = ad.layout === 'quote' ? 500 : 700;
  const listN = ad.layout === 'list' ? ad.items.filter(Boolean).length : 0; const avail = th - u * 9; // leave room under the logo row
  let hl = fit(ctx, headText, px => `${hw} ${px}px ${disp}`, tw, ad.layout === 'list' ? 2 : 4, u * (landscape ? 8 : 10)); let k = 1, sl: string[] = [], blockH = 0;
  for (let i = 0; i < 24; i++) {
    ctx.font = `400 ${u * 3.6 * k}px ${body}`; sl = ad.sub ? lines(ctx, ad.sub, tw).slice(0, 3) : [];
    blockH = hl.ls.length * hl.px * 1.08 + (sl.length ? u * 2.5 + sl.length * u * 4.8 * k : 0) + listN * u * 6.4 * k + (ad.cta ? u * 4 + ctaH * k : 0);
    if (blockH <= avail) break; k *= 0.94; hl = fit(ctx, headText, px => `${hw} ${px}px ${disp}`, tw, ad.layout === 'list' ? 2 : 4, hl.px * 0.92);
  }
  let ty = ad.layout === 'quote' ? y + (th - blockH) / 2 + u * 4 : y + th - blockH;
  ctx.fillStyle = light; ctx.font = `${ad.layout === 'quote' ? 500 : 700} ${hl.px}px ${disp}`; for (const l of hl.ls) { ctx.fillText(l, x, ty); ty += hl.px * 1.08; }
  if (sl.length) { ty += u * 2.5; ctx.globalAlpha = 0.82; ctx.font = `400 ${u * 3.6 * k}px ${body}`; for (const l of sl) { ctx.fillText(l, x, ty); ty += u * 4.8 * k; } ctx.globalAlpha = 1; }
  if (ad.layout === 'list') { ty += u * 2; ctx.font = `500 ${u * 3.6 * k}px ${body}`; for (const it of ad.items.filter(Boolean)) { ctx.fillStyle = acc; ctx.beginPath(); ctx.arc(x + u * 1.5, ty + u * 2 * k, u * 1.4 * k, 0, 7); ctx.fill(); ctx.fillStyle = light; ctx.fillText(it, x + u * 5, ty); ty += u * 6.4 * k; } }
  if (ad.cta) { ty += u * 4; const ch = ctaH * k; ctx.font = `600 ${u * 3.6 * k}px ${body}`; const cw = ctx.measureText(ad.cta).width + u * 8 * k; ctx.fillStyle = acc; ctx.beginPath(); ctx.roundRect(x, ty, cw, ch, ch / 2); ctx.fill(); ctx.fillStyle = ad.tone === 'accent' ? b.bg : '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(ad.cta, x + u * 4 * k, ty + ch / 2); }
  ctx.textBaseline = 'alphabetic';
}

export default function StaticAds({ A, brand, onSaved }: { A: AssetApi; brand: Brand; onSaved: (r: SavedRender) => void }) {
  const [ad, setAd] = useState<Ad>({ layout: 'product', headline: 'Close the month before lunch', sub: 'Bank feeds sorted and tax set aside, automatically.', cta: 'Start free', items: ['Auto-categorised bank feeds', 'Tax set aside per invoice', 'Receipts matched for you'], tone: 'light', badge: 'New' });
  const [sizes, setSizes] = useState<string[]>(['feed-sq', 'feed-45', 'story', 'link']); const [variants, setVariants] = useState<Variant[]>([]); const [plats, setPlats] = useState(['meta', 'linkedin', 'google']);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<unknown>(null); const [, force] = useState(0); const refs = useRef<Record<string, HTMLCanvasElement | null>>({});
  useEffect(() => { Promise.all([loadFont(brand.display), loadFont(brand.body)]).then(() => document.fonts.ready).then(() => force(n => n + 1)); }, [brand.display, brand.body]);
  useEffect(() => { for (const s of STATIC_SIZES) { const c = refs.current[s.id]; if (!c) continue; c.width = s.w; c.height = s.h; drawStatic(c.getContext('2d')!, s.w, s.h, ad, brand, A.assets); } });
  const set = (p: Partial<Ad>) => setAd(a => ({ ...a, ...p }));
  async function copy() { setBusy(true); setErr(null); try { const r = await api<{ variants: Variant[] }>('/api/ad/adcopy', { platforms: plats, brief: { product: `${brand.name}. ${ad.sub}`, audience: '' }, offer: ad.cta }); setVariants(r.variants); } catch (e) { setErr(e); } finally { setBusy(false); } }
  const png = (id: string) => new Promise<Blob>(r => refs.current[id]!.toBlob(b => r(b!), 'image/png'));
  async function save(id: string, dl: boolean) { const s = STATIC_SIZES.find(x => x.id === id)!; const blob = await png(id); const name = `${brand.name.toLowerCase().replace(/\W+/g, '-')}-${s.id}-${s.w}x${s.h}.png`;
    if (dl) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); return; }
    const rid = uid(); const meta: SavedRender = { id: rid, name, project: `Static · ${ad.headline.slice(0, 30)}`, format: 'png', width: s.w, height: s.h, duration: 0, audio: false, at: new Date().toISOString(), size: blob.size }; await idbPut(`render:${rid}`, { blob, meta }); onSaved(meta); }

  return <div className="static">
    <aside className="ed-side">
      <section className="ed-card"><h3 className="h3">Layout</h3>
        <div className="seg wrap">{(['headline', 'product', 'split', 'list', 'quote'] as StaticLayout[]).map(l => <button key={l} className={ad.layout === l ? 'on' : ''} onClick={() => set({ layout: l })}>{l}</button>)}</div>
        <div className="seg">{(['light', 'dark', 'accent'] as const).map(t => <button key={t} className={ad.tone === t ? 'on' : ''} onClick={() => set({ tone: t })}>{t}</button>)}</div>
        <label className="label">Headline<textarea rows={2} value={ad.headline} onChange={e => set({ headline: e.target.value })} /></label>
        <label className="label">Supporting line<input className="input" value={ad.sub} onChange={e => set({ sub: e.target.value })} /></label>
        {ad.layout === 'list' && <label className="label">Bullets<textarea rows={3} value={ad.items.join('\n')} onChange={e => set({ items: e.target.value.split('\n').slice(0, 5) })} /></label>}
        <div className="two"><label className="label">Button<input className="input" value={ad.cta} onChange={e => set({ cta: e.target.value })} /></label><label className="label">Badge<input className="input" value={ad.badge} onChange={e => set({ badge: e.target.value })} /></label></div>
        <div className="label">Product image<div className="row">{ad.image ? <span className="chip">{A.assets.get(ad.image)?.name.slice(0, 24)}</span> : <span className="small muted">None</span>}<label className="btn sm"><Icon name="image" />Upload<input type="file" hidden accept="image/*" onChange={async e => { const f = e.target.files?.[0]; if (f) try { set({ image: (await A.addBlob(f, f.name)).id }); } catch (er) { setErr(er); } }} /></label>{ad.image && <button className="btn ghost sm" onClick={() => set({ image: undefined })}>Remove</button>}</div></div>
      </section>
      <section className="ed-card"><h3 className="h3">Copy variants</h3><p className="small muted">Written to each platform&apos;s character limits; anything over is flagged, never trimmed silently.</p>
        <div className="seg wrap">{['meta', 'google', 'linkedin', 'tiktok', 'x', 'youtube'].map(p => <button key={p} className={plats.includes(p) ? 'on' : ''} onClick={() => setPlats(x => x.includes(p) ? x.filter(y => y !== p) : [...x, p])}>{p}</button>)}</div>
        <button className="btn" disabled={busy || !plats.length} onClick={copy}>{busy ? <span className="spin" /> : <Icon name="spark" />}Write variants</button>
        <div className="variants">{variants.map((v, i) => <button key={i} className="variant" onClick={() => set({ headline: v.headline || v.primary || ad.headline, sub: v.primary && v.headline ? v.primary : v.description ?? ad.sub, cta: v.cta || ad.cta })}>
          <span className="small muted">{v.platform} · {v.angle}</span>{v.headline && <b>{v.headline}</b>}{v.primary && <span>{v.primary}</span>}{v.description && <span className="small">{v.description}</span>}
          {v.over.length ? <span className="small warn-text">Over limit: {v.over.join(', ')}</span> : <span className="small ok-text">Within limits</span>}</button>)}</div>
      </section>
    </aside>
    <section className="static-grid">{STATIC_SIZES.map(s => <figure key={s.id} className={`static-item ${sizes.includes(s.id) ? '' : 'off'}`}>
      <canvas ref={el => { refs.current[s.id] = el; }} style={{ aspectRatio: `${s.w}/${s.h}` }} aria-label={`${s.label} preview`} />
      <figcaption><label className="chk small"><input type="checkbox" checked={sizes.includes(s.id)} onChange={() => setSizes(x => x.includes(s.id) ? x.filter(y => y !== s.id) : [...x, s.id])} /><b>{s.label}</b></label><span className="small muted">{s.w}×{s.h} · {s.where}</span>
        <div className="row"><button className="btn sm" onClick={() => save(s.id, true)}><Icon name="download" />PNG</button><button className="btn ghost sm" onClick={() => save(s.id, false)}>Save to Deliver</button></div></figcaption></figure>)}
      <div className="row"><button className="btn primary" onClick={async () => { for (const id of sizes) await save(id, true); }}><Icon name="download" />Download {sizes.length} PNGs</button></div>
    </section>
    <ErrorNote error={err} onClose={() => setErr(null)} />
  </div>;
}
