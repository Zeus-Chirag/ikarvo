/* eslint-disable @next/next/no-img-element -- local object URLs */
'use client';
import { useEffect, useRef, useState } from 'react';
import Icon from '../Icon';
import { ErrorNote, Pill } from '../ws';
import { api } from '@/lib/client/api';
import { estimateWords, uid, type Aspect, type Brand, type Project, type Scene, type Word } from './engine';
import { HOOKS, fillHook } from './library';
import type { AssetApi } from './assets';

type Ready = Record<string, { label: string; missing: string[] }>;
export type Readiness = { targets: Ready; avatar: Ready; tts: Ready; captions?: Ready; music?: Ready; footage: { label: string; missing: string[] } };
type Actor = 'provider' | 'upload' | 'none';

const FAL_LIPSYNC = ['omnihuman', 'latentsync', 'sadtalker'];
async function dataUrl(u?: string): Promise<string> { if (!u) throw new Error('Missing media.'); const b = await (await fetch(u)).blob(); if (b.size > 3_000_000) throw new Error('File is over 3 MB; trim it before sending to the provider.');
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(b); }); }

export default function Ugc({ A, brand, ready, onCompose, seed }: { A: AssetApi; brand: Brand; ready: Readiness | null; onCompose: (p: Project) => void; seed?: { product?: string; audience?: string } }) {
  const [brief, setBrief] = useState({ product: seed?.product ?? `${brand.name}: bookkeeping for freelancers that sorts bank transactions and sets tax aside automatically.`, audience: seed?.audience ?? 'Freelance designers and developers', pain: 'doing my books', outcome: 'close my month', time: '10 minutes', category: 'bookkeeping', task: 'reconcile a month', competitor: 'a spreadsheet', 'old way': 'spreadsheets' });
  const [hook, setHook] = useState(''); const [script, setScript] = useState(''); const [aspect, setAspect] = useState<Aspect>('9:16'); const [cta, setCta] = useState('Try it free');
  const [tts, setTts] = useState('elevenlabs'); const [voice, setVoice] = useState<{ asset: string; words: Word[]; estimated: boolean } | null>(null);
  const [actor, setActor] = useState<Actor>('none'); const [prov, setProv] = useState('heygen'); const [avatarId, setAvatarId] = useState(''); const [job, setJob] = useState<{ id: string; status: string; error?: string } | null>(null); const [actorAsset, setActorAsset] = useState<string | null>(null);
  const [media, setMedia] = useState<{ url: string; name: string; kind: string } | null>(null); const [capProv, setCapProv] = useState('whisper'); const [musProv, setMusProv] = useState('elevenlabs');
  const [musicPrompt, setMusicPrompt] = useState('Warm lo-fi beat, 95 bpm, light and optimistic, no vocals'); const [music, setMusic] = useState<string | null>(null);
  const [broll, setBroll] = useState<string[]>([]); const [gen, setGen] = useState(''); const [busy, setBusy] = useState(''); const [err, setErr] = useState<unknown>(null);
  const timer = useRef<number | undefined>(undefined); useEffect(() => () => clearInterval(timer.current), []);
  const run = async (k: string, f: () => Promise<void>) => { setBusy(k); setErr(null); try { await f(); } catch (e) { setErr(e); } finally { setBusy(''); } };
  const vars = brief as Record<string, string>;

  const writeScript = () => run('script', async () => {
    const r = await api<{ concept: { hooks: string[]; script: { voiceover: string }[]; ctas: string[] } }>('/api/creative', { product: brief.product, audience: brief.audience, format: 'UGC talking-head', platform: aspect === '9:16' ? 'TikTok / Reels' : 'Meta feed', tone: 'Candid, first person, specific' });
    const lines = r.concept.script?.map(s => s.voiceover).filter(Boolean) ?? []; const h = hook || r.concept.hooks?.[0] || '';
    setScript([h, ...lines.filter(l => l !== h)].join('\n')); if (r.concept.ctas?.[0]) setCta(r.concept.ctas[0]);
  });
  const speakIt = () => run('voice', async () => {
    const r = await api<{ audio: string; words: Word[] | null }>('/api/ad/tts', { provider: tts, text: script });
    const a = await A.addUrl(r.audio, `Voiceover (${ready?.tts[tts]?.label ?? tts})`); const d = a.duration ?? 10;
    setVoice({ asset: a.id, words: r.words ?? estimateWords(script, 0, d), estimated: !r.words });
  });
  const uploadVoice = (f?: File) => f && run('voice', async () => { const a = await A.addBlob(f, f.name); setVoice({ asset: a.id, words: estimateWords(script, 0, a.duration ?? 10), estimated: true }); });
  const makeActor = () => run('actor', async () => {
    const needsAudio = FAL_LIPSYNC.includes(prov); if (needsAudio && !voice) throw new Error('This model lip-syncs to your voiceover. Create one in step 2 first.');
    const audioUrl = needsAudio && voice ? await dataUrl(A.assets.get(voice.asset)?.url) : undefined;
    const j = await api<{ id: string; status: string; error?: string }>('/api/ad/avatar', { provider: prov, script, aspect, avatar: avatarId || undefined, title: brand.name, media: media?.url || (prov === 'did' ? avatarId || undefined : undefined), audioUrl }); setJob(j);
    clearInterval(timer.current); timer.current = window.setInterval(async () => {
      try { const s = await api<{ id: string; status: string; url?: string; error?: string }>(`/api/ad/avatar/${encodeURIComponent(j.id)}`); setJob(s);
        if (s.status === 'succeeded' && s.url) { clearInterval(timer.current); const a = await A.addUrl(s.url, `${ready?.avatar[prov]?.label ?? prov} actor`); setActorAsset(a.id); }
        if (s.status === 'failed') clearInterval(timer.current); } catch (e) { clearInterval(timer.current); setErr(e); }
    }, 5000);
  });
  const uploadActor = (f?: File) => f && run('actor', async () => { const a = await A.addBlob(f, f.name); if (a.kind !== 'video') throw new Error('Upload a video file (MP4, MOV or WebM).'); setActorAsset(a.id); });
  const addBroll = (fs: FileList | null) => fs && run('broll', async () => { const ids: string[] = []; for (const f of [...fs].slice(0, 8)) ids.push((await A.addBlob(f, f.name)).id); setBroll(b => [...b, ...ids]); });
  const genBroll = () => run('gen', async () => {
    const j = await api<{ id: string }>('/api/media', { kind: 'image', prompt: gen, aspect: aspect === '4:5' ? '1:1' : aspect });
    for (let i = 0; i < 60; i++) { await new Promise(r => setTimeout(r, 3000)); const s = await api<{ status: string; output: string[]; error?: string }>(`/api/media/${encodeURIComponent(j.id)}`);
      if (s.status === 'failed') throw new Error(s.error ?? 'Generation failed.'); if (s.status === 'succeeded') { for (const u of s.output.slice(0, 2)) { const a = await A.addUrl(u, 'Generated b-roll'); setBroll(b => [...b, a.id]); } return; } }
    throw new Error('Generation timed out after 3 minutes.');
  });

  const retime = () => run('cap', async () => { if (!voice) throw new Error('Create a voiceover first.');
    const r = await api<{ words: Word[]; exact: boolean }>('/api/ad/captions', { provider: capProv, audio: await dataUrl(A.assets.get(voice.asset)?.url) });
    if (!r.words.length) throw new Error('No speech found in the voiceover.'); setVoice({ ...voice, words: r.words, estimated: !r.exact }); });
  const makeMusic = () => run('music', async () => { const d = A.assets.get(voice?.asset ?? '')?.duration ?? 20;
    const r = await api<{ audio: string }>('/api/ad/music', { provider: musProv, prompt: musicPrompt, seconds: d + 3 }); const a = await A.addUrl(r.audio, `Music (${ready?.music?.[musProv]?.label ?? musProv})`); setMusic(a.id); });
  const uploadMusic = (f?: File) => f && run('music', async () => { const a = await A.addBlob(f, f.name); setMusic(a.id); });
  const [hf, setHf] = useState<{ missing: string[] } | null>(null); const [hfPrompt, setHfPrompt] = useState('Friendly 30-year-old creator, phone selfie framing, natural window light, plain background, looking at camera');
  useEffect(() => { fetch('/api/ad/higgsfield').then(r => r.json()).then(setHf).catch(() => {}); }, []);
  const hfPortrait = () => run('media', async () => { const j = await api<{ id: string }>('/api/ad/higgsfield', { prompt: hfPrompt });
    for (let i = 0; i < 60; i++) { await new Promise(r => setTimeout(r, 3000)); const st = await api<{ status: string; url?: string; error?: string }>(`/api/ad/higgsfield?id=${encodeURIComponent(j.id)}`);
      if (st.status === 'failed') throw new Error(st.error ?? 'Higgsfield generation failed.');
      if (st.status === 'succeeded' && st.url) { const r = await fetch(`/api/ad/proxy?url=${encodeURIComponent(st.url)}`); if (!r.ok) throw new Error('Could not fetch the portrait.'); setMedia({ url: await dataUrl(URL.createObjectURL(await r.blob())), name: 'Higgsfield Soul portrait', kind: 'image' }); return; } }
    throw new Error('Higgsfield timed out after 3 minutes.'); });
  const pickMedia = (f?: File) => f && run('media', async () => { const u = URL.createObjectURL(f); setMedia({ url: await dataUrl(u), name: f.name, kind: f.type.split('/')[0] }); });
  function compose() {
    const speech = actorAsset ? A.assets.get(actorAsset) : voice ? A.assets.get(voice.asset) : undefined; const D = Math.max(6, speech?.duration ?? estimateWords(script, 0, 0).at(-1)?.end ?? 12);
    const lines = script.split('\n').map(l => l.trim()).filter(Boolean); const scenes: Scene[] = []; const n = Math.max(2, Math.min(8, lines.length)); const seg = D / n;
    for (let i = 0; i < n; i++) {
      const img = broll.length ? broll[i % broll.length] : undefined; const talk = !!actorAsset && (i === 0 || i % 2 === 0 || !img);
      scenes.push({ id: uid(), template: talk ? 'avatar' : img ? 'broll' : 'kinetic', dur: Math.round(seg * 10) / 10, headline: talk || img ? '' : (lines[i] ?? ''), image: talk ? undefined : img, anim: 'pop', transition: i === 0 ? 'cut' : talk ? 'cut' : 'zoom', bg: 'solid', tone: i % 2 ? 'dark' : 'light' });
    }
    scenes.push({ id: uid(), template: 'cta', dur: 2.6, headline: brand.name, sub: cta, anim: 'pop', transition: 'fade', bg: 'gradient' });
    const words = actorAsset ? estimateWords(script, 0, D) : voice?.words ?? estimateWords(script, 0, D);
    onCompose({ id: uid(), name: `UGC · ${hook.slice(0, 30) || brand.name}`, aspect, fps: 30, brand, scenes, grain: false,
      voice: !actorAsset && voice ? { asset: voice.asset, volume: 1 } : undefined, music: music ? { asset: music, volume: 0.22 } : undefined, avatar: actorAsset ? { asset: actorAsset, volume: 1 } : undefined,
      captions: { on: true, style: 'bold', words, estimated: actorAsset ? true : voice?.estimated ?? true } });
  }
  const miss = (r?: { missing: string[] }) => r?.missing ?? [];
  const canCompose = script.trim().length > 10 && (voice || actorAsset || broll.length);

  return <div className="ugc">
    <ol className="steps-ol">
      <li className="ugc-step"><h3 className="h3"><span>1</span>Hook &amp; script</h3>
        <div className="two"><label className="label">Product<textarea rows={2} value={brief.product} onChange={e => setBrief({ ...brief, product: e.target.value })} /></label><label className="label">Audience<input className="input" value={brief.audience} onChange={e => setBrief({ ...brief, audience: e.target.value })} /></label></div>
        <details className="hooks-lib"><summary>Hooks library · {HOOKS.reduce((a, h) => a + h.hooks.length, 0)} formulas, filled from your brief</summary>
          <div className="two">{(['pain', 'outcome', 'time', 'category'] as const).map(k => <label key={k} className="label">{`{${k}}`}<input className="input" value={vars[k]} onChange={e => setBrief({ ...brief, [k]: e.target.value })} /></label>)}</div>
          {HOOKS.map(g => <div key={g.cat} className="hook-cat"><b>{g.cat}</b>{g.hooks.map(h => { const f = fillHook(h, vars); return <button key={h} className={`hook ${hook === f ? 'on' : ''}`} onClick={() => { setHook(f); setScript(s => s ? [f, ...s.split('\n').slice(1)].join('\n') : f); }}>{f}</button>; })}</div>)}
        </details>
        <label className="label">Script (one line per beat; first line is the hook)<textarea rows={6} value={script} onChange={e => setScript(e.target.value)} placeholder="Pick a hook above or let AI write the script." /></label>
        <div className="row"><button className="btn" disabled={!!busy} onClick={writeScript}>{busy === 'script' ? <span className="spin" /> : <Icon name="spark" />}Write script with AI</button>
          <span className="small muted">{script.split(/\s+/).filter(Boolean).length} words ≈ {Math.round(script.split(/\s+/).filter(Boolean).length / 2.6)}s spoken</span>
          <div className="seg">{(['9:16', '4:5', '1:1', '16:9'] as Aspect[]).map(a => <button key={a} className={aspect === a ? 'on' : ''} onClick={() => setAspect(a)}>{a}</button>)}</div></div></li>

      <li className="ugc-step"><h3 className="h3"><span>2</span>Voiceover</h3>
        <div className="row wrap">{Object.entries(ready?.tts ?? {}).map(([k, r]) => <button key={k} className={`prov ${tts === k ? 'on' : ''}`} onClick={() => setTts(k)}><b>{r.label}</b><Pill ok={!r.missing.length}>{r.missing.length ? 'Not set up' : 'Ready'}</Pill></button>)}</div>
        {!!miss(ready?.tts[tts]).length && <p className="small warn-text">Add {miss(ready?.tts[tts]).join(', ')} to the server environment to generate voice with {ready?.tts[tts]?.label}. You can still upload your own recording.</p>}
        <div className="row"><button className="btn" disabled={!!busy || script.length < 5 || !!miss(ready?.tts[tts]).length} onClick={speakIt}>{busy === 'voice' ? <span className="spin" /> : <Icon name="mic" />}Generate voiceover</button>
          <label className="btn ghost"><Icon name="upload" />Upload recording<input type="file" hidden accept="audio/*" onChange={e => uploadVoice(e.target.files?.[0])} /></label>
          {voice && <span className="chip ok">{A.assets.get(voice.asset)?.name} · {A.assets.get(voice.asset)?.duration?.toFixed(1)}s · {voice.estimated ? 'captions estimated' : 'word timestamps'}</span>}</div>
        {voice && <audio controls src={A.assets.get(voice.asset)?.url} />}</li>

      <li className="ugc-step"><h3 className="h3"><span>3</span>Actor</h3>
        <div className="seg">{([['none', 'B-roll only'], ['provider', 'AI avatar'], ['upload', 'Upload creator video']] as [Actor, string][]).map(([k, l]) => <button key={k} className={actor === k ? 'on' : ''} onClick={() => setActor(k)}>{l}</button>)}</div>
        {actor === 'provider' && <>
          <div className="row wrap">{Object.entries(ready?.avatar ?? {}).map(([k, r]) => <button key={k} className={`prov ${prov === k ? 'on' : ''}`} onClick={() => setProv(k)}><b>{r.label}</b><Pill ok={!r.missing.length}>{r.missing.length ? 'Not set up' : 'Ready'}</Pill></button>)}</div>
          {!!miss(ready?.avatar[prov]).length && <p className="small warn-text">Needs {miss(ready?.avatar[prov]).join(', ')}. Avatars are generated by {ready?.avatar[prov]?.label} on your own account and use your credits there.</p>}
          {(FAL_LIPSYNC.includes(prov) || prov === 'did') && <div className="row wrap">
            {prov !== 'did' ? <label className="btn ghost"><Icon name="upload" />{prov === 'latentsync' ? 'Presenter video (≤3 MB)' : 'Portrait image (≤3 MB)'}<input type="file" hidden accept={prov === 'latentsync' ? 'video/*' : 'image/*'} onChange={e => pickMedia(e.target.files?.[0])} /></label>
              : <span className="small muted">D-ID downloads the portrait, so paste a public https image URL below.</span>}
            {prov !== 'did' && prov !== 'latentsync' && <><input className="input" aria-label="Portrait prompt" value={hfPrompt} onChange={e => setHfPrompt(e.target.value)} />
              <button className="btn ghost" disabled={!!busy || !!hf?.missing.length} title={hf?.missing.length ? `Needs ${hf.missing.join(', ')}` : ''} onClick={hfPortrait}>{busy === 'media' ? <span className="spin" /> : <Icon name="spark" />}Generate portrait (Higgsfield)</button>
              {!!hf?.missing.length && <span className="small muted">Higgsfield needs {hf.missing.join(', ')}.</span>}</>}
            {media && <span className="chip ok">{media.name}</span>}
            <span className="small muted">{prov === 'did' ? 'Speaks the script with a Microsoft voice (DID_VOICE_ID).' : 'Lip-syncs to the voiceover from step 2. Audio must be under 30 s.'}</span></div>}
          <div className="row"><input className="input" aria-label="Avatar ID" placeholder={prov === 'did' ? 'https://… portrait URL (or DID_SOURCE_URL)' : FAL_LIPSYNC.includes(prov) ? 'Not needed for this model' : 'Avatar / creator ID (optional if set in env)'} disabled={FAL_LIPSYNC.includes(prov)} value={avatarId} onChange={e => setAvatarId(e.target.value)} />
            <button className="btn" disabled={!!busy || script.length < 5 || !!miss(ready?.avatar[prov]).length || (job && !['succeeded', 'failed'].includes(job.status)) || false} onClick={makeActor}>{busy === 'actor' ? <span className="spin" /> : <Icon name="user" />}Render avatar</button></div>
          <p className="small muted">{FAL_LIPSYNC.includes(prov) ? 'Your voiceover and portrait are sent to fal as data URIs.' : 'HeyGen, Synthesia, Creatify and D-ID speak the script with their own voices.'}</p>
          {job && <p className="small">{ready?.avatar[prov]?.label} job <span className="mono">{job.id}</span> · {job.status}{job.error ? ` · ${job.error}` : ''} {!['succeeded', 'failed'].includes(job.status) && <span className="spin" />}</p>}</>}
        {actor === 'upload' && <label className="btn ghost"><Icon name="upload" />Upload video<input type="file" hidden accept="video/*" onChange={e => uploadActor(e.target.files?.[0])} /></label>}
        {actorAsset && <div className="row"><video className="thumb-v" src={A.assets.get(actorAsset)?.url} muted playsInline /><span className="chip ok">{A.assets.get(actorAsset)?.name} · {A.assets.get(actorAsset)?.duration?.toFixed(1)}s</span><button className="btn ghost sm" onClick={() => setActorAsset(null)}>Remove</button></div>}</li>

      <li className="ugc-step"><h3 className="h3"><span>4</span>B-roll from product images</h3>
        <div className="row"><label className="btn ghost"><Icon name="image" />Upload images or clips<input type="file" hidden multiple accept="image/*,video/*" onChange={e => addBroll(e.target.files)} /></label>
          <input className="input" placeholder="Or describe a shot to generate (Replicate / fal)" value={gen} onChange={e => setGen(e.target.value)} />
          <button className="btn" disabled={!!busy || gen.length < 5 || !!ready?.footage.missing.length} title={ready?.footage.missing.length ? `Needs ${ready.footage.missing.join(', ')}` : ''} onClick={genBroll}>{busy === 'gen' ? <span className="spin" /> : 'Generate'}</button></div>
        {!!ready?.footage.missing.length && <p className="small muted">Generation needs {ready.footage.missing.join(', ')}. Uploads always work.</p>}
        {!!broll.length && <div className="broll">{broll.map(id => { const a = A.assets.get(id); return a && <div key={id} className="br">{a.kind === 'video' ? <video src={a.url} muted /> : <img src={a.url} alt={a.name} />}<button aria-label="Remove" onClick={() => setBroll(b => b.filter(x => x !== id))}>×</button></div>; })}</div>}</li>

      <li className="ugc-step"><h3 className="h3"><span>5</span>Captions &amp; music</h3>
        <div className="row wrap">{Object.entries(ready?.captions ?? {}).map(([k, r]) => <button key={k} className={`prov ${capProv === k ? 'on' : ''}`} onClick={() => setCapProv(k)}><b>{r.label}</b><Pill ok={!r.missing.length}>{r.missing.length ? 'Not set up' : 'Ready'}</Pill></button>)}</div>
        {!!miss(ready?.captions?.[capProv]).length && <p className="small warn-text">Needs {miss(ready?.captions?.[capProv]).join(', ')}.</p>}
        <div className="row"><button className="btn" disabled={!!busy || !voice || !!miss(ready?.captions?.[capProv]).length} onClick={retime}>{busy === 'cap' ? <span className="spin" /> : <Icon name="doc" />}Time captions from the audio</button>
          <span className="small muted">{voice ? (voice.estimated ? 'Captions are estimated from word count until you run this.' : 'Captions use measured word timings.') : 'Needs a voiceover.'}</span></div>
        <div className="row wrap">{Object.entries(ready?.music ?? {}).map(([k, r]) => <button key={k} className={`prov ${musProv === k ? 'on' : ''}`} onClick={() => setMusProv(k)}><b>{r.label}</b><Pill ok={!r.missing.length}>{r.missing.length ? 'Not set up' : 'Ready'}</Pill></button>)}</div>
        {!!miss(ready?.music?.[musProv]).length && <p className="small warn-text">Needs {miss(ready?.music?.[musProv]).join(', ')}. You can upload a licensed track instead.</p>}
        <div className="row"><input className="input" aria-label="Music prompt" value={musicPrompt} onChange={e => setMusicPrompt(e.target.value)} />
          <button className="btn" disabled={!!busy || !!miss(ready?.music?.[musProv]).length} onClick={makeMusic}>{busy === 'music' ? <span className="spin" /> : <Icon name="spark" />}Generate bed</button>
          <label className="btn ghost"><Icon name="upload" />Upload track<input type="file" hidden accept="audio/*" onChange={e => uploadMusic(e.target.files?.[0])} /></label></div>
        {music && <div className="row"><audio controls src={A.assets.get(music)?.url} /><button className="btn ghost sm" onClick={() => setMusic(null)}>Remove</button></div>}</li>

      <li className="ugc-step"><h3 className="h3"><span>6</span>Compose, render &amp; export</h3>
        <div className="row"><label className="label grow">End-card CTA<input className="input" value={cta} onChange={e => setCta(e.target.value)} /></label></div>
        <button className="btn primary" disabled={!canCompose} onClick={compose}><Icon name="layers" />Compose ad and open in editor</button>
        <p className="small muted">The editor renders MP4/WebM on your device (WebCodecs, ffmpeg.wasm fallback) with burned-in captions; Deliver publishes or downloads it.</p>
        {!canCompose && <p className="small muted">Needs a script plus at least one of: voiceover, actor video, or b-roll.</p>}</li>
    </ol>
    <ErrorNote error={err} onClose={() => setErr(null)} />
  </div>;
}
