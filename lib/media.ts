import 'server-only';
import { envValue } from '@/lib/env';

export type MediaKind = 'image' | 'video';
export type MediaJob = { id: string; provider: 'replicate' | 'fal'; status: 'queued' | 'running' | 'succeeded' | 'failed'; output: string[]; error?: string };

export function mediaProvider(): 'replicate' | 'fal' | null {
  const pref = envValue('MEDIA_PROVIDER');
  if (pref === 'fal' && envValue('FAL_KEY')) return 'fal';
  if (envValue('REPLICATE_API_TOKEN')) return 'replicate';
  if (envValue('FAL_KEY')) return 'fal';
  return null;
}
const RATIO: Record<string, { w: number; h: number }> = { '9:16': { w: 720, h: 1280 }, '1:1': { w: 1024, h: 1024 }, '16:9': { w: 1280, h: 720 } };

function model(provider: string, kind: MediaKind) {
  const defaults = { replicate: { image: 'black-forest-labs/flux-schnell', video: 'minimax/video-01' }, fal: { image: 'fal-ai/flux/schnell', video: 'fal-ai/kling-video/v1/standard/text-to-video' } } as const;
  const k = `${provider.toUpperCase()}_${kind.toUpperCase()}_MODEL`;
  return envValue(k) || defaults[provider as 'replicate' | 'fal'][kind];
}
const flat = (o: unknown): string[] => typeof o === 'string' ? [o] : Array.isArray(o) ? o.flatMap(flat) : o && typeof o === 'object' ? Object.values(o).flatMap(flat).filter(s => /^https?:\/\//.test(s)) : [];

export async function createJob(kind: MediaKind, prompt: string, aspect: string): Promise<MediaJob> {
  const provider = mediaProvider(); if (!provider) throw new Error('NOT_CONFIGURED');
  const m = model(provider, kind);
  if (provider === 'replicate') {
    const res = await fetch(`https://api.replicate.com/v1/models/${m}/predictions`, { method: 'POST',
      headers: { Authorization: `Bearer ${envValue('REPLICATE_API_TOKEN')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: { prompt, aspect_ratio: aspect } }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Replicate error (${res.status}): ${d?.detail ?? d?.title ?? 'request failed'}`);
    return { id: `replicate:${d.id}`, provider, status: 'queued', output: [] };
  }
  const size = RATIO[aspect] ?? RATIO['1:1'];
  const res = await fetch(`https://queue.fal.run/${m}`, { method: 'POST',
    headers: { Authorization: `Key ${envValue('FAL_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, aspect_ratio: aspect, image_size: { width: size.w, height: size.h } }) });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`fal error (${res.status}): ${d?.detail ?? 'request failed'}`);
  const app = m.split('/').slice(0, 2).join('/');
  return { id: `fal:${Buffer.from(`${app}|${d.request_id}`).toString('base64url')}`, provider, status: 'queued', output: [] };
}

export async function getJob(id: string): Promise<MediaJob> {
  const [provider, ref] = id.split(':', 2);
  if (provider === 'replicate') {
    if (!/^[a-z0-9]+$/i.test(ref)) throw new Error('Invalid job id.');
    const res = await fetch(`https://api.replicate.com/v1/predictions/${ref}`, { headers: { Authorization: `Bearer ${envValue('REPLICATE_API_TOKEN')}` }, cache: 'no-store' });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Replicate error (${res.status})`);
    const status = d.status === 'succeeded' ? 'succeeded' : d.status === 'failed' || d.status === 'canceled' ? 'failed' : d.status === 'processing' ? 'running' : 'queued';
    return { id, provider: 'replicate', status, output: flat(d.output), error: d.error ?? undefined };
  }
  if (provider === 'fal') {
    const [app, rid] = Buffer.from(ref, 'base64url').toString().split('|');
    if (!/^[\w.-]+\/[\w.-]+$/.test(app) || !/^[\w-]+$/.test(rid)) throw new Error('Invalid job id.');
    const h = { Authorization: `Key ${envValue('FAL_KEY')}` };
    const s = await fetch(`https://queue.fal.run/${app}/requests/${rid}/status`, { headers: h, cache: 'no-store' }).then(r => r.json());
    if (s.status !== 'COMPLETED') return { id, provider: 'fal', status: s.status === 'IN_PROGRESS' ? 'running' : 'queued', output: [] };
    const out = await fetch(`https://queue.fal.run/${app}/requests/${rid}`, { headers: h, cache: 'no-store' }).then(r => r.json());
    const urls = flat(out?.images ?? out?.video ?? out);
    return { id, provider: 'fal', status: urls.length ? 'succeeded' : 'failed', output: urls, error: urls.length ? undefined : out?.detail ? String(out.detail) : 'No output returned.' };
  }
  throw new Error('Unknown provider.');
}
