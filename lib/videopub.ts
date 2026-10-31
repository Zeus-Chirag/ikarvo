import 'server-only';
import { envValue as v } from '@/lib/env';
import { GRAPH } from '@/lib/publishers';
import { tiktokKeys, tiktokToken } from '@/lib/tokens';
import { googleAccess, googleScopes } from '@/lib/google';

/** Video destinations for Ad Studio exports. Every target uploads the actual file bytes; nothing needs a public URL. */
export type VideoUpload = { file: Blob; name: string; title: string; description: string; privacy?: string };
export type VideoResult = { id: string; url?: string | null; status: string; note?: string };
export class SetupError extends Error { constructor(public keys: string[], msg: string) { super(msg); } }
async function j(r: Response, label: string) { const d = await r.json().catch(() => ({})); if (!r.ok || (d.error && d.error.code && d.error.code !== 'ok')) throw new Error(`${label} rejected the upload (${r.status}): ${d?.error?.message ?? d?.error?.code ?? JSON.stringify(d).slice(0, 200)}`); return d; }
const miss = (keys: string[]) => keys.filter(k => !v(k));

export const VIDEO_TARGETS = {
  meta_page: { label: 'Facebook Page video', keys: ['FACEBOOK_PAGE_ID', 'FACEBOOK_PAGE_TOKEN'] },
  meta_ads: { label: 'Meta ad account (video library)', keys: ['META_AD_ACCOUNT_ID', 'META_ADS_TOKEN'] },
  tiktok: { label: 'TikTok (draft to your inbox)', get keys() { return tiktokKeys(); } },
  youtube: { label: 'YouTube upload', keys: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'SESSION_SECRET'] },
} as const;
export type VideoTarget = keyof typeof VIDEO_TARGETS;
export const videoMissing = (t: VideoTarget) => miss([...VIDEO_TARGETS[t].keys]);

export async function uploadVideo(t: VideoTarget, u: VideoUpload): Promise<VideoResult> {
  const m = videoMissing(t); if (m.length) throw new SetupError(m, `${VIDEO_TARGETS[t].label} is not configured. Add ${m.join(', ')}.`);
  if (t === 'meta_page' || t === 'meta_ads') {
    // Graph API video upload (non-resumable, files up to ~1 GB / 20 min). graph-video host per Meta docs.
    const page = t === 'meta_page'; const node = page ? v('FACEBOOK_PAGE_ID') : `act_${v('META_AD_ACCOUNT_ID').replace(/^act_/, '')}`;
    const f = new FormData(); f.set('access_token', v(page ? 'FACEBOOK_PAGE_TOKEN' : 'META_ADS_TOKEN')); f.set('source', u.file, u.name);
    if (page) { f.set('title', u.title.slice(0, 250)); f.set('description', u.description.slice(0, 5000)); f.set('published', u.privacy === 'public' ? 'true' : 'false'); } else f.set('name', u.title.slice(0, 250));
    const d = await j(await fetch(`https://graph-video.facebook.com/${GRAPH()}/${node}/${page ? 'videos' : 'advideos'}`, { method: 'POST', body: f }), 'Meta');
    return { id: d.id, url: page ? `https://www.facebook.com/${v('FACEBOOK_PAGE_ID')}/videos/${d.id}` : null, status: page ? (u.privacy === 'public' ? 'published' : 'uploaded unpublished') : 'in ad video library',
      note: page ? undefined : 'Use this video id when you create the ad creative in Ads Manager.' };
  }
  if (t === 'tiktok') {
    const size = u.file.size; const chunk = size <= 64e6 ? size : 10_000_000; const n = size <= 64e6 ? 1 : Math.floor(size / chunk);
    const token = await tiktokToken();
    const d = await j(await fetch('https://open.tiktokapis.com/v2/post/publish/inbox/video/init/', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ source_info: { source: 'FILE_UPLOAD', video_size: size, chunk_size: chunk, total_chunk_count: n } }) }), 'TikTok');
    const url = d.data?.upload_url as string; const buf = new Uint8Array(await u.file.arrayBuffer());
    for (let i = 0; i < n; i++) {
      const start = i * chunk; const end = i === n - 1 ? size : start + chunk;
      const r = await fetch(url, { method: 'PUT', headers: { 'Content-Type': u.file.type || 'video/mp4', 'Content-Range': `bytes ${start}-${end - 1}/${size}`, 'Content-Length': String(end - start) }, body: buf.slice(start, end) });
      if (!r.ok && r.status !== 206) throw new Error(`TikTok chunk ${i + 1}/${n} failed (${r.status}).`);
    }
    return { id: d.data?.publish_id, status: 'sent to TikTok inbox', note: 'Open TikTok to add the caption and post. Direct posting needs an audited app with video.publish.' };
  }
  const token = await googleAccess(); if (!token) throw new SetupError([], 'Connect Google with YouTube upload permission first (Integrations → YouTube).');
  if (!(await googleScopes()).includes('https://www.googleapis.com/auth/youtube.upload')) throw new SetupError([], 'Your Google connection does not include YouTube upload. Reconnect with "Add YouTube".');
  const init = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', { method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': u.file.type || 'video/mp4', 'X-Upload-Content-Length': String(u.file.size) },
    body: JSON.stringify({ snippet: { title: u.title.slice(0, 100), description: u.description.slice(0, 5000), categoryId: '22' }, status: { privacyStatus: ['public', 'unlisted', 'private'].includes(u.privacy ?? '') ? u.privacy : 'private', selfDeclaredMadeForKids: false } }) });
  if (!init.ok) await j(init, 'YouTube');
  const loc = init.headers.get('location'); if (!loc) throw new Error('YouTube did not return an upload URL.');
  const d = await j(await fetch(loc, { method: 'PUT', headers: { 'Content-Type': u.file.type || 'video/mp4' }, body: u.file }), 'YouTube');
  return { id: d.id, url: `https://youtu.be/${d.id}`, status: d.status?.privacyStatus ?? 'uploaded', note: 'Apps that have not passed the YouTube API audit can only upload private videos.' };
}
