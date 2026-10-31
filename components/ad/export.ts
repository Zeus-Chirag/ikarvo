import { ASPECTS, drawFrame, resolveFont, total, type Assets, type Project } from './engine';

export type Format = 'mp4' | 'webm';
export type RenderOpts = { format: Format; height: 720 | 1080; fps: 30 | 60; onProgress?: (p: number, label: string) => void; signal?: AbortSignal };
export type Rendered = { blob: Blob; name: string; format: Format; width: number; height: number; duration: number; audio: boolean; codec: string; warnings: string[] };
export class CodecUnsupported extends Error {}

export const resolved = (p: Project): Project => ({ ...p, brand: { ...p.brand, display: resolveFont(p.brand.display), body: resolveFont(p.brand.body) } });
const even = (n: number) => Math.round(n / 2) * 2;
export function sizeFor(p: Project, height: 720 | 1080): [number, number] { const [w, h] = ASPECTS[p.aspect]; const s = height / Math.min(w, h); return [even(w * s), even(h * s)]; }

/** Mix music + voiceover + avatar audio into one stereo 48 kHz buffer (offline, sample-accurate). */
export async function mixAudio(p: Project, assets: Assets): Promise<AudioBuffer | null> {
  const T = total(p); const tracks = [p.music && { ...p.music, fade: true }, p.voice && { ...p.voice, fade: false }, p.avatar && { ...p.avatar, fade: false }].filter(Boolean) as { asset: string; volume: number; fade: boolean }[];
  const bufs = tracks.map(t => ({ t, b: assets.get(t.asset)?.buffer })).filter(x => x.b) as { t: { asset: string; volume: number; fade: boolean }; b: AudioBuffer }[];
  if (!bufs.length || T <= 0) return null;
  const ctx = new OfflineAudioContext(2, Math.ceil(T * 48000), 48000);
  for (const { t, b } of bufs) { const src = ctx.createBufferSource(); src.buffer = b; const g = ctx.createGain(); const vol = t.fade && (p.voice || p.avatar) ? t.volume * 0.45 : t.volume; // duck music under speech
    g.gain.setValueAtTime(vol, 0); if (t.fade) { g.gain.setValueAtTime(vol, Math.max(0, T - 1.5)); g.gain.linearRampToValueAtTime(0, T); }
    src.connect(g).connect(ctx.destination); src.start(0); }
  return ctx.startRendering();
}

async function seekVideos(p: Project, assets: Assets, t: number) {
  const vids: [HTMLVideoElement, number][] = [];
  if (p.avatar) { const a = assets.get(p.avatar.asset); if (a?.el instanceof HTMLVideoElement) vids.push([a.el, t]); }
  let acc = 0; for (const s of p.scenes) { if (s.image) { const a = assets.get(s.image); if (a?.el instanceof HTMLVideoElement && t >= acc && t < acc + s.dur) vids.push([a.el, t - acc]); } acc += s.dur; }
  await Promise.all(vids.map(([v, at]) => new Promise<void>(res => { const target = Math.min(at, (v.duration || at) - 0.01); if (Math.abs(v.currentTime - target) < 0.004) return res(); const done = () => { v.removeEventListener('seeked', done); res(); }; v.addEventListener('seeked', done); v.currentTime = Math.max(0, target); setTimeout(done, 1500); })));
}

/** Frame-exact export with WebCodecs (H.264/AAC → MP4, VP9/Opus → WebM). Faster than real time on most machines. */
export async function render(p0: Project, assets: Assets, o: RenderOpts): Promise<Rendered> {
  if (typeof VideoEncoder === 'undefined') throw new CodecUnsupported('This browser has no WebCodecs encoder. Use Chrome, Edge or Safari 17+.');
  const p = resolved(p0); const [W, H] = sizeFor(p, o.height); const T = total(p); const frames = Math.ceil(T * o.fps); const warnings: string[] = [];
  const candidates = o.format === 'mp4' ? ['avc1.640028', 'avc1.4d0028', 'avc1.42e01f'] : ['vp09.00.40.08', 'vp8'];
  let codec = ''; const bitrate = Math.round(W * H * o.fps * 0.14);
  for (const c of candidates) { const r = await VideoEncoder.isConfigSupported({ codec: c, width: W, height: H, bitrate, framerate: o.fps }).catch(() => ({ supported: false })); if (r.supported) { codec = c; break; } }
  if (!codec) throw new CodecUnsupported(o.format === 'mp4' ? 'This browser cannot encode H.264. Export WebM, then convert it to MP4 with the built-in converter (ffmpeg.wasm).' : 'This browser cannot encode VP9/VP8.');
  o.onProgress?.(0, 'Mixing audio');
  const audio = await mixAudio(p, assets);
  let aCodec: string | null = null;
  if (audio) { const ac = o.format === 'mp4' ? 'mp4a.40.2' : 'opus'; const r = await AudioEncoder.isConfigSupported({ codec: ac, sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 }).catch(() => ({ supported: false })); if (r.supported) aCodec = ac; else warnings.push(`This browser cannot encode ${o.format === 'mp4' ? 'AAC' : 'Opus'} audio, so the file is silent. Export ${o.format === 'mp4' ? 'WebM' : 'MP4'} or use Chrome.`); }
  const vConf = o.format === 'mp4' ? { codec: 'avc' as const, width: W, height: H } : { codec: 'V_VP9' as const, width: W, height: H };
  const target = o.format === 'mp4' ? new (await import('mp4-muxer')).ArrayBufferTarget() : new (await import('webm-muxer')).ArrayBufferTarget();
  const muxer = o.format === 'mp4'
    ? new (await import('mp4-muxer')).Muxer({ target: target as import('mp4-muxer').ArrayBufferTarget, video: { ...vConf, codec: 'avc', frameRate: o.fps }, ...(aCodec ? { audio: { codec: 'aac', numberOfChannels: 2, sampleRate: 48000 } } : {}), fastStart: 'in-memory', firstTimestampBehavior: 'offset' })
    : new (await import('webm-muxer')).Muxer({ target: target as import('webm-muxer').ArrayBufferTarget, video: { codec: codec.startsWith('vp8') ? 'V_VP8' : 'V_VP9', width: W, height: H, frameRate: o.fps }, ...(aCodec ? { audio: { codec: 'A_OPUS', numberOfChannels: 2, sampleRate: 48000 } } : {}), firstTimestampBehavior: 'offset' });
  let encErr: unknown = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m = muxer as any;
  const venc = new VideoEncoder({ output: (ch, meta) => m.addVideoChunk(ch, meta), error: e => { encErr = e; } });
  venc.configure({ codec, width: W, height: H, bitrate, framerate: o.fps, latencyMode: 'quality', ...(codec.startsWith('avc') ? { avc: { format: 'avc' } } : {}) } as VideoEncoderConfig);
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H; const ctx = canvas.getContext('2d', { alpha: false })!;
  const vids = [...assets.values()].filter(a => a.el instanceof HTMLVideoElement).map(a => a.el as HTMLVideoElement); vids.forEach(v => v.pause());
  for (let i = 0; i < frames; i++) {
    if (o.signal?.aborted) { venc.close(); throw new DOMException('Export cancelled', 'AbortError'); } if (encErr) throw encErr;
    const t = i / o.fps; await seekVideos(p, assets, t); drawFrame(ctx, p, assets, t, [W, H]);
    const f = new VideoFrame(canvas, { timestamp: Math.round(t * 1e6), duration: Math.round(1e6 / o.fps) }); venc.encode(f, { keyFrame: i % (o.fps * 2) === 0 }); f.close();
    while (venc.encodeQueueSize > 8) await new Promise(r => setTimeout(r, 2));
    if (i % 10 === 0) { o.onProgress?.(i / frames, `Frame ${i}/${frames}`); await new Promise(r => setTimeout(r, 0)); }
  }
  await venc.flush(); venc.close();
  if (audio && aCodec) {
    o.onProgress?.(0.98, 'Encoding audio');
    const aenc = new AudioEncoder({ output: (ch, meta) => m.addAudioChunk(ch, meta), error: e => { encErr = e; } });
    aenc.configure({ codec: aCodec, sampleRate: 48000, numberOfChannels: 2, bitrate: 192000 });
    const L = audio.getChannelData(0), R = audio.numberOfChannels > 1 ? audio.getChannelData(1) : L; const N = 1024;
    for (let s = 0; s < audio.length; s += N) { const n = Math.min(N, audio.length - s); const buf = new Float32Array(n * 2); buf.set(L.subarray(s, s + n), 0); buf.set(R.subarray(s, s + n), n);
      const d = new AudioData({ format: 'f32-planar', sampleRate: 48000, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(s / 48000 * 1e6), data: buf }); aenc.encode(d); d.close(); }
    await aenc.flush(); aenc.close();
  }
  if (encErr) throw encErr;
  m.finalize(); const buf = (target as { buffer: ArrayBuffer }).buffer;
  o.onProgress?.(1, 'Done');
  const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ad';
  return { blob: new Blob([buf], { type: o.format === 'mp4' ? 'video/mp4' : 'video/webm' }), name: `${slug}-${p.aspect.replace(':', 'x')}-${H > W ? W : H}p.${o.format}`, format: o.format, width: W, height: H, duration: T, audio: !!(audio && aCodec), codec, warnings };
}

/** Fallback for browsers without an H.264 encoder: transcode WebM → MP4 (H.264/AAC) in a worker with ffmpeg.wasm (~31 MB core, loaded on demand). */
export async function webmToMp4(webm: Blob, onProgress?: (p: number) => void): Promise<Blob> {
  const { FFmpeg } = await import('@ffmpeg/ffmpeg'); const { toBlobURL, fetchFile } = await import('@ffmpeg/util');
  const ff = new FFmpeg(); const base = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';
  ff.on('progress', e => onProgress?.(e.progress));
  await ff.load({ coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'), wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm') });
  await ff.writeFile('in.webm', await fetchFile(webm));
  const code = await ff.exec(['-i', 'in.webm', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', 'out.mp4']);
  if (code !== 0) throw new Error(`ffmpeg exited with code ${code}`);
  const data = await ff.readFile('out.mp4'); ff.terminate();
  return new Blob([new Uint8Array(data as Uint8Array)], { type: 'video/mp4' });
}

/** Still frame → PNG (for thumbnails and static ads). */
export async function snapshot(p0: Project, assets: Assets, t: number, height: 720 | 1080 = 1080) { const p = resolved(p0); const [W, H] = sizeFor(p, height); const c = document.createElement('canvas'); c.width = W; c.height = H; await seekVideos(p, assets, t); drawFrame(c.getContext('2d')!, p, assets, t, [W, H]); return new Promise<Blob>(r => c.toBlob(b => r(b!), 'image/png')); }
