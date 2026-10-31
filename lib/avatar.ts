import 'server-only';
import { envValue as v } from '@/lib/env';
/**
 * Lip-synced AI presenter video. Each provider uses its own avatar/voice IDs from your account (set in env or passed per request).
 * Verified against: HeyGen v3 (POST /v3/videos, GET /v3/videos/{id}), Synthesia v2 (POST /v2/videos, GET /v2/videos/{id}),
 * Creatify (POST /api/lipsyncs/, GET /api/lipsyncs/{id}/).
 */
export const AVATAR = {
  heygen: { label: 'HeyGen', keys: ['HEYGEN_API_KEY'], idKey: 'HEYGEN_AVATAR_ID' },
  synthesia: { label: 'Synthesia', keys: ['SYNTHESIA_API_KEY'], idKey: 'SYNTHESIA_AVATAR' },
  creatify: { label: 'Creatify', keys: ['CREATIFY_API_ID', 'CREATIFY_API_KEY'], idKey: 'CREATIFY_CREATOR_ID' },
  did: { label: 'D-ID', keys: ['DID_API_KEY'], idKey: 'DID_SOURCE_URL' },
  omnihuman: { label: 'OmniHuman (fal)', keys: ['FAL_KEY'], idKey: '' },
  latentsync: { label: 'LatentSync (fal)', keys: ['FAL_KEY'], idKey: '' },
  sadtalker: { label: 'SadTalker (fal)', keys: ['FAL_KEY'], idKey: '' },
} as const;
/** fal models take a portrait (or a source video for LatentSync) plus our own voiceover audio. Data URIs are accepted by fal. */
const FAL_APP: Record<string, { app: string; needs: 'image' | 'video'; input: (media: string, audio: string) => Record<string, unknown> }> = {
  omnihuman: { app: 'fal-ai/bytedance/omnihuman', needs: 'image', input: (m, a) => ({ image_url: m, audio_url: a }) },
  latentsync: { app: 'fal-ai/latentsync', needs: 'video', input: (m, a) => ({ video_url: m, audio_url: a }) },
  sadtalker: { app: 'fal-ai/sadtalker', needs: 'image', input: (m, a) => ({ source_image_url: m, driven_audio_url: a }) },
};
export const AVATAR_INPUTS: Record<string, 'script' | 'image+audio' | 'video+audio' | 'image+script'> = { heygen: 'script', synthesia: 'script', creatify: 'script', did: 'image+script', omnihuman: 'image+audio', latentsync: 'video+audio', sadtalker: 'image+audio' };
export type AvatarProvider = keyof typeof AVATAR;
export const avatarMissing = (p: AvatarProvider) => AVATAR[p].keys.filter(k => !v(k));
export type AvatarJob = { id: string; provider: AvatarProvider; status: 'queued' | 'running' | 'succeeded' | 'failed'; url?: string; captionsUrl?: string; error?: string };
const RATIO: Record<string, string> = { '9:16': '9:16', '1:1': '1:1', '16:9': '16:9', '4:5': '4:5' };
async function j(r: Response, label: string) { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(`${label} error (${r.status}): ${d?.error?.message ?? d?.error ?? d?.detail ?? d?.message ?? 'request failed'}`); return d; }

export async function createAvatar(p: AvatarProvider, o: { script: string; aspect: string; avatar?: string; voice?: string; audioUrl?: string; background?: string; title?: string; media?: string }): Promise<AvatarJob> {
  if (FAL_APP[p]) {
    const f = FAL_APP[p]; const media = o.media || o.avatar;
    if (!media) throw Object.assign(new Error(`${AVATAR[p].label} needs a ${f.needs === 'image' ? 'portrait image' : 'source video of the presenter'}.`), { status: 400 });
    if (!o.audioUrl) throw Object.assign(new Error(`${AVATAR[p].label} lip-syncs to your voiceover. Generate or upload the voiceover first.`), { status: 400 });
    const d = await j(await fetch(`https://queue.fal.run/${f.app}`, { method: 'POST', headers: { Authorization: `Key ${v('FAL_KEY')}`, 'Content-Type': 'application/json' }, body: JSON.stringify(f.input(media, o.audioUrl)) }), 'fal');
    return { id: `${p}:${d.request_id}`, provider: p, status: 'queued' };
  }
  if (p === 'did') {
    const src = o.media || o.avatar || v('DID_SOURCE_URL');
    if (!src || !/^https:\/\//.test(src)) throw Object.assign(new Error('D-ID needs a public https portrait URL (source_url) or DID_SOURCE_URL.'), { status: 400 });
    const script = o.audioUrl && /^https:/.test(o.audioUrl) ? { type: 'audio', audio_url: o.audioUrl } : { type: 'text', input: o.script, ...(o.voice || v('DID_VOICE_ID') ? { provider: { type: 'microsoft', voice_id: o.voice || v('DID_VOICE_ID') } } : {}) };
    const d = await j(await fetch('https://api.d-id.com/talks', { method: 'POST', headers: { Authorization: `Basic ${v('DID_API_KEY')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ source_url: src, script, config: { stitch: true } }) }), 'D-ID');
    return { id: `did:${d.id}`, provider: p, status: 'queued' };
  }
  const avatar = o.avatar || v(AVATAR[p].idKey);
  if (!avatar) throw Object.assign(new Error(`Pick an ${AVATAR[p].label} avatar ID (or set ${AVATAR[p].idKey}).`), { status: 400 });
  if (p === 'heygen') {
    const body: Record<string, unknown> = { type: 'avatar', avatar_id: avatar, title: o.title ?? 'Ikarvo UGC ad', aspect_ratio: RATIO[o.aspect] ?? '9:16', resolution: '1080p', caption: { file_format: 'srt' } };
    if (o.audioUrl) body.audio_url = o.audioUrl; else { body.script = o.script; if (o.voice || v('HEYGEN_VOICE_ID')) body.voice_id = o.voice || v('HEYGEN_VOICE_ID'); }
    if (o.background) body.background = { type: 'color', value: o.background };
    const d = await j(await fetch('https://api.heygen.com/v3/videos', { method: 'POST', headers: { 'x-api-key': v('HEYGEN_API_KEY'), 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), 'HeyGen');
    return { id: `heygen:${d.data?.video_id}`, provider: p, status: 'queued' };
  }
  if (p === 'synthesia') {
    const asp = ['16:9', '9:16', '1:1', '4:5'].includes(o.aspect) ? o.aspect : '9:16';
    const d = await j(await fetch('https://api.synthesia.io/v2/videos', { method: 'POST', headers: { Authorization: v('SYNTHESIA_API_KEY'), 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: v('SYNTHESIA_TEST') !== '0', title: o.title ?? 'Ikarvo UGC ad', aspectRatio: asp, visibility: 'private',
        input: [{ avatar, background: o.background && /^#/.test(o.background) ? 'off_white' : (o.background || 'off_white'), scriptText: o.script, avatarSettings: { style: 'rectangular', ...(o.voice || v('SYNTHESIA_VOICE_ID') ? { voice: o.voice || v('SYNTHESIA_VOICE_ID') } : {}) } }] }) }), 'Synthesia');
    return { id: `synthesia:${d.id}`, provider: p, status: 'queued' };
  }
  const asp = ({ '9:16': '9x16', '1:1': '1x1', '16:9': '16x9' } as Record<string, string>)[o.aspect] ?? '9x16';
  const d = await j(await fetch('https://api.creatify.ai/api/lipsyncs/', { method: 'POST', headers: { 'X-API-ID': v('CREATIFY_API_ID'), 'X-API-KEY': v('CREATIFY_API_KEY'), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: o.title ?? 'Ikarvo UGC ad', creator: avatar, aspect_ratio: asp, ...(o.audioUrl ? { audio: o.audioUrl } : { text: o.script }), ...(o.voice || v('CREATIFY_ACCENT_ID') ? { accent: o.voice || v('CREATIFY_ACCENT_ID') } : {}), model_version: v('CREATIFY_MODEL') || 'aurora_v1_fast', no_caption: true, no_music: true }) }), 'Creatify');
  return { id: `creatify:${d.id}`, provider: 'creatify', status: 'queued' };
}

export async function avatarStatus(id: string): Promise<AvatarJob> {
  const [p, ref] = id.split(':', 2) as [AvatarProvider, string];
  if (!AVATAR[p] || !/^[\w-]+$/.test(ref ?? '')) throw Object.assign(new Error('Invalid job id.'), { status: 400 });
  if (FAL_APP[p]) {
    const app = FAL_APP[p].app; const h = { Authorization: `Key ${v('FAL_KEY')}` };
    const st = await j(await fetch(`https://queue.fal.run/${app}/requests/${ref}/status`, { headers: h, cache: 'no-store' }), 'fal');
    if (st.status !== 'COMPLETED') return { id, provider: p, status: st.status === 'IN_PROGRESS' ? 'running' : 'queued' };
    const out = await fetch(`https://queue.fal.run/${app}/requests/${ref}`, { headers: h, cache: 'no-store' }).then(r => r.json()).catch(() => ({}));
    const url = out?.video?.url; return { id, provider: p, status: url ? 'succeeded' : 'failed', url, error: url ? undefined : String(out?.detail ? JSON.stringify(out.detail).slice(0, 300) : 'fal returned no video') };
  }
  if (p === 'did') {
    const d = await j(await fetch(`https://api.d-id.com/talks/${ref}`, { headers: { Authorization: `Basic ${v('DID_API_KEY')}` }, cache: 'no-store' }), 'D-ID');
    return { id, provider: p, status: d.status === 'done' ? 'succeeded' : ['error', 'rejected'].includes(d.status) ? 'failed' : d.status === 'started' ? 'running' : 'queued', url: d.result_url, error: d.error?.description ?? d.error?.kind };
  }
  if (p === 'heygen') {
    const d = (await j(await fetch(`https://api.heygen.com/v3/videos/${ref}`, { headers: { 'x-api-key': v('HEYGEN_API_KEY') }, cache: 'no-store' }), 'HeyGen')).data ?? {};
    const st = String(d.status ?? ''); const done = st === 'completed' || st === 'succeeded';
    return { id, provider: p, status: done ? 'succeeded' : st === 'failed' ? 'failed' : st === 'processing' ? 'running' : 'queued', url: d.video_url ?? d.url, captionsUrl: d.subtitle_url ?? d.caption_url, error: d.failure_message ?? d.error?.message };
  }
  if (p === 'synthesia') {
    const d = await j(await fetch(`https://api.synthesia.io/v2/videos/${ref}`, { headers: { Authorization: v('SYNTHESIA_API_KEY') }, cache: 'no-store' }), 'Synthesia');
    return { id, provider: p, status: d.status === 'complete' ? 'succeeded' : ['error', 'rejected', 'deleted'].includes(d.status) ? 'failed' : 'running', url: d.download, captionsUrl: d.captions?.srt ?? undefined, error: ['error', 'rejected'].includes(d.status) ? `Synthesia: ${d.status}` : undefined };
  }
  const d = await j(await fetch(`https://api.creatify.ai/api/lipsyncs/${ref}/`, { headers: { 'X-API-ID': v('CREATIFY_API_ID'), 'X-API-KEY': v('CREATIFY_API_KEY') }, cache: 'no-store' }), 'Creatify');
  return { id, provider: p, status: d.status === 'done' ? 'succeeded' : d.status === 'failed' ? 'failed' : d.status === 'running' ? 'running' : 'queued', url: d.output ?? d.video_output, error: d.failed_reason || undefined };
}
