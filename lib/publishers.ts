import 'server-only';
import { createHmac } from 'node:crypto';
import { envValue as v } from '@/lib/env';
import { mdToHtml } from '@/lib/markdown';
import { tiktokToken, tiktokKeys, xAuthHeader, xMode } from '@/lib/tokens';
export const GRAPH = () => v('META_GRAPH_VERSION') || 'v26.0';

/** Every publisher declares its env keys; missing keys => NotConfigured (HTTP 503 with names). */
export class NotConfigured extends Error { constructor(public keys: string[], label: string) { super(`${label} is not configured. Add ${keys.join(', ')} to .env.local and restart.`); } }
export class PublishError extends Error {}
type Res = { id?: string; url?: string | null; status?: string };
const need = (label: string, keys: string[]) => { const m = keys.filter(k => !v(k)); if (m.length) throw new NotConfigured(m, label); };
async function j(r: Response, label: string) { const d = await r.json().catch(() => ({})); if (!r.ok) throw new PublishError(`${label} rejected the request (${r.status}): ${d?.error?.message ?? d?.message ?? d?.detail ?? d?.title ?? JSON.stringify(d).slice(0, 200)}`); return d; }

export type SocialPost = { text: string; mediaUrl?: string; title?: string };
export const SOCIAL: Record<string, { label: string; keys: string[]; needsMedia?: 'image' | 'video'; limit: number; publish: (p: SocialPost) => Promise<Res> }> = {
  x: { label: 'X', keys: ['X_ACCESS_TOKEN'], limit: 280, async publish({ text }) {
    need('X', this.keys); const r = await fetch('https://api.x.com/2/tweets', { method: 'POST', headers: { Authorization: xAuthHeader('POST', 'https://api.x.com/2/tweets'), 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
    if (r.status === 401 && xMode() === 'oauth2') throw new PublishError('X rejected the token (401). OAuth 2.0 user tokens expire after 2 hours; set X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN and X_ACCESS_SECRET (OAuth 1.0a) for a non-expiring server publisher.');
    const d = await j(r, 'X');
    return { id: d.data?.id, url: `https://x.com/i/web/status/${d.data?.id}` }; } },
  linkedin: { label: 'LinkedIn', keys: ['LINKEDIN_ACCESS_TOKEN', 'LINKEDIN_AUTHOR_URN'], limit: 3000, async publish({ text }) {
    need('LinkedIn', this.keys);
    const r = await fetch('https://api.linkedin.com/rest/posts', { method: 'POST', headers: { Authorization: `Bearer ${v('LINKEDIN_ACCESS_TOKEN')}`, 'Content-Type': 'application/json', 'LinkedIn-Version': v('LINKEDIN_API_VERSION') || '202610', 'X-Restli-Protocol-Version': '2.0.0' },
      body: JSON.stringify({ author: v('LINKEDIN_AUTHOR_URN'), commentary: text.replace(/([\\(){}[\]<>@|~_*#])/g, '\\$1'), visibility: 'PUBLIC', distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] }, lifecycleState: 'PUBLISHED', isReshareDisabledByAuthor: false }) });
    if (!r.ok) await j(r, 'LinkedIn'); const id = r.headers.get('x-restli-id') ?? ''; return { id, url: id ? `https://www.linkedin.com/feed/update/${id}` : null }; } },
  threads: { label: 'Threads', keys: ['THREADS_ACCESS_TOKEN', 'THREADS_USER_ID'], limit: 500, async publish({ text, mediaUrl }) {
    need('Threads', this.keys); const base = `https://graph.threads.net/v1.0/${v('THREADS_USER_ID')}`; const tok = v('THREADS_ACCESS_TOKEN');
    const q = new URLSearchParams({ media_type: mediaUrl ? 'IMAGE' : 'TEXT', text, access_token: tok, ...(mediaUrl ? { image_url: mediaUrl } : {}) });
    const c = await j(await fetch(`${base}/threads?${q}`, { method: 'POST' }), 'Threads');
    const p = await j(await fetch(`${base}/threads_publish?${new URLSearchParams({ creation_id: c.id, access_token: tok })}`, { method: 'POST' }), 'Threads');
    return { id: p.id, url: null }; } },
  bluesky: { label: 'Bluesky', keys: ['BLUESKY_HANDLE', 'BLUESKY_APP_PASSWORD'], limit: 300, async publish({ text }) {
    need('Bluesky', this.keys); const pds = v('BLUESKY_PDS') || 'https://bsky.social';
    const s = await j(await fetch(`${pds}/xrpc/com.atproto.server.createSession`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: v('BLUESKY_HANDLE'), password: v('BLUESKY_APP_PASSWORD') }) }), 'Bluesky');
    const facets = [...text.matchAll(/https?:\/\/[^\s]+/g)].map(m => { const start = Buffer.byteLength(text.slice(0, m.index)); return { index: { byteStart: start, byteEnd: start + Buffer.byteLength(m[0]) }, features: [{ $type: 'app.bsky.richtext.facet#link', uri: m[0] }] }; });
    const d = await j(await fetch(`${pds}/xrpc/com.atproto.repo.createRecord`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.accessJwt}` }, body: JSON.stringify({ repo: s.did, collection: 'app.bsky.feed.post', record: { $type: 'app.bsky.feed.post', text, createdAt: new Date().toISOString(), ...(facets.length ? { facets } : {}) } }) }), 'Bluesky');
    return { id: d.uri, url: `https://bsky.app/profile/${s.handle}/post/${String(d.uri).split('/').pop()}` }; } },
  facebook: { label: 'Facebook Page', keys: ['FACEBOOK_PAGE_ID', 'FACEBOOK_PAGE_TOKEN'], limit: 5000, async publish({ text, mediaUrl }) {
    need('Facebook', this.keys); const g = GRAPH();
    const d = await j(await fetch(`https://graph.facebook.com/${g}/${v('FACEBOOK_PAGE_ID')}/${mediaUrl ? 'photos' : 'feed'}`, { method: 'POST', body: new URLSearchParams({ ...(mediaUrl ? { url: mediaUrl, caption: text } : { message: text }), access_token: v('FACEBOOK_PAGE_TOKEN') }) }), 'Facebook');
    return { id: d.post_id ?? d.id, url: `https://www.facebook.com/${d.post_id ?? d.id}` }; } },
  instagram: { label: 'Instagram', keys: ['INSTAGRAM_USER_ID', 'FACEBOOK_PAGE_TOKEN'], needsMedia: 'image', limit: 2200, async publish({ text, mediaUrl }) {
    need('Instagram', this.keys); if (!mediaUrl) throw new PublishError('Instagram requires an image URL (public JPEG). Add one to the post.');
    const g = GRAPH(); const base = `https://graph.facebook.com/${g}/${v('INSTAGRAM_USER_ID')}`; const tok = v('FACEBOOK_PAGE_TOKEN');
    const c = await j(await fetch(`${base}/media`, { method: 'POST', body: new URLSearchParams({ image_url: mediaUrl, caption: text, access_token: tok }) }), 'Instagram');
    const p = await j(await fetch(`${base}/media_publish`, { method: 'POST', body: new URLSearchParams({ creation_id: c.id, access_token: tok }) }), 'Instagram');
    return { id: p.id, url: null }; } },
  tiktok: { label: 'TikTok', get keys() { return tiktokKeys(); }, needsMedia: 'video', limit: 2200, async publish({ text, mediaUrl }) {
    need('TikTok', tiktokKeys()); if (!mediaUrl) throw new PublishError('TikTok needs a video URL on a domain verified in your TikTok developer app.');
    const d = await j(await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', { method: 'POST', headers: { Authorization: `Bearer ${await tiktokToken()}`, 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ post_info: { title: text.slice(0, 2200), privacy_level: v('TIKTOK_PRIVACY_LEVEL') || 'SELF_ONLY' }, source_info: { source: 'PULL_FROM_URL', video_url: mediaUrl } }) }), 'TikTok');
    if (d.error?.code && d.error.code !== 'ok') throw new PublishError(`TikTok: ${d.error.message}`);
    return { id: d.data?.publish_id, url: null, status: 'processing' }; } },
};

export type Article = { title: string; markdown: string; slug?: string; excerpt?: string };
const ricos = (md: string) => ({ nodes: md.split(/\n{2,}/).filter(Boolean).map((p, i) => ({ type: 'PARAGRAPH', id: `p${i}`, nodes: [{ type: 'TEXT', id: `t${i}`, textData: { text: p.replace(/[#*_`>]/g, '').trim(), decorations: [] } }] })) });
function ghostJwt() { const [id, secret] = v('GHOST_ADMIN_API_KEY').split(':'); if (!id || !secret) throw new NotConfigured(['GHOST_ADMIN_API_KEY'], 'Ghost (key must be id:secret)');
  const b = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url'); const now = Math.floor(Date.now() / 1000);
  const head = b({ alg: 'HS256', typ: 'JWT', kid: id }), body = b({ iat: now, exp: now + 300, aud: '/admin/' });
  return `${head}.${body}.${createHmac('sha256', Buffer.from(secret, 'hex')).update(`${head}.${body}`).digest('base64url')}`; }

export const CMS: Record<string, { label: string; keys: string[]; publish: (a: Article) => Promise<Res> }> = {
  wordpress: { label: 'WordPress', keys: ['WORDPRESS_URL', 'WORDPRESS_USER', 'WORDPRESS_APP_PASSWORD'], async publish(a) {
    need('WordPress', this.keys); const d = await j(await fetch(`${v('WORDPRESS_URL').replace(/\/+$/, '')}/wp-json/wp/v2/posts`, { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${v('WORDPRESS_USER')}:${v('WORDPRESS_APP_PASSWORD')}`).toString('base64')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: a.title, content: mdToHtml(a.markdown), excerpt: a.excerpt, slug: a.slug, status: 'draft' }) }), 'WordPress'); return { id: String(d.id), url: d.link, status: d.status }; } },
  ghost: { label: 'Ghost', keys: ['GHOST_URL', 'GHOST_ADMIN_API_KEY'], async publish(a) {
    need('Ghost', this.keys); const d = await j(await fetch(`${v('GHOST_URL').replace(/\/+$/, '')}/ghost/api/admin/posts/?source=html`, { method: 'POST', headers: { Authorization: `Ghost ${ghostJwt()}`, 'Content-Type': 'application/json', 'Accept-Version': 'v5.0' },
      body: JSON.stringify({ posts: [{ title: a.title, html: mdToHtml(a.markdown), slug: a.slug, custom_excerpt: a.excerpt?.slice(0, 300), status: 'draft' }] }) }), 'Ghost'); return { id: d.posts?.[0]?.id, url: d.posts?.[0]?.url, status: 'draft' }; } },
  webflow: { label: 'Webflow', keys: ['WEBFLOW_TOKEN', 'WEBFLOW_COLLECTION_ID'], async publish(a) {
    need('Webflow', this.keys); const d = await j(await fetch(`https://api.webflow.com/v2/collections/${v('WEBFLOW_COLLECTION_ID')}/items`, { method: 'POST', headers: { Authorization: `Bearer ${v('WEBFLOW_TOKEN')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDraft: true, isArchived: false, fieldData: { name: a.title, slug: a.slug, [v('WEBFLOW_BODY_FIELD') || 'post-body']: mdToHtml(a.markdown), ...(v('WEBFLOW_SUMMARY_FIELD') ? { [v('WEBFLOW_SUMMARY_FIELD')]: a.excerpt } : {}) } }) }), 'Webflow');
    return { id: d.id, url: null, status: 'draft' }; } },
  sanity: { label: 'Sanity', keys: ['SANITY_PROJECT_ID', 'SANITY_DATASET', 'SANITY_TOKEN'], async publish(a) {
    need('Sanity', this.keys); const id = `drafts.ikarvo-${a.slug ?? Date.now()}`;
    await j(await fetch(`https://${v('SANITY_PROJECT_ID')}.api.sanity.io/v2023-08-01/data/mutate/${v('SANITY_DATASET')}`, { method: 'POST', headers: { Authorization: `Bearer ${v('SANITY_TOKEN')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mutations: [{ createOrReplace: { _id: id, _type: v('SANITY_DOC_TYPE') || 'post', title: a.title, slug: { _type: 'slug', current: a.slug }, excerpt: a.excerpt, [v('SANITY_BODY_FIELD') || 'markdown']: a.markdown } }] }) }), 'Sanity');
    return { id, url: null, status: 'draft' }; } },
  hubspot: { label: 'HubSpot', keys: ['HUBSPOT_TOKEN', 'HUBSPOT_BLOG_ID'], async publish(a) {
    need('HubSpot', this.keys); const d = await j(await fetch('https://api.hubapi.com/cms/v3/blogs/posts', { method: 'POST', headers: { Authorization: `Bearer ${v('HUBSPOT_TOKEN')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: a.title, htmlTitle: a.title, slug: a.slug, metaDescription: a.excerpt, contentGroupId: v('HUBSPOT_BLOG_ID'), postBody: mdToHtml(a.markdown), state: 'DRAFT', ...(v('HUBSPOT_AUTHOR_ID') ? { blogAuthorId: v('HUBSPOT_AUTHOR_ID') } : {}) }) }), 'HubSpot');
    return { id: d.id, url: d.url ?? null, status: 'draft' }; } },
  wix: { label: 'Wix Blog', keys: ['WIX_API_KEY', 'WIX_SITE_ID', 'WIX_MEMBER_ID'], async publish(a) {
    need('Wix', this.keys); const d = await j(await fetch('https://www.wixapis.com/blog/v3/draft-posts', { method: 'POST', headers: { Authorization: v('WIX_API_KEY'), 'wix-site-id': v('WIX_SITE_ID'), 'Content-Type': 'application/json' },
      body: JSON.stringify({ draftPost: { title: a.title, memberId: v('WIX_MEMBER_ID'), excerpt: a.excerpt, richContent: ricos(a.markdown) } }) }), 'Wix');
    return { id: d.draftPost?.id, url: null, status: 'draft' }; } },
  medium: { label: 'Medium', keys: ['MEDIUM_TOKEN'], async publish(a) {
    need('Medium', this.keys); const h = { Authorization: `Bearer ${v('MEDIUM_TOKEN')}`, 'Content-Type': 'application/json', Accept: 'application/json' };
    const me = await j(await fetch('https://api.medium.com/v1/me', { headers: h }), 'Medium');
    const d = await j(await fetch(`https://api.medium.com/v1/users/${me.data.id}/posts`, { method: 'POST', headers: h, body: JSON.stringify({ title: a.title, contentFormat: 'markdown', content: `# ${a.title}\n\n${a.markdown}`, publishStatus: 'draft' }) }), 'Medium');
    return { id: d.data?.id, url: d.data?.url, status: 'draft' }; } },
};

export function publisherStatus() {
  const s = (keys: string[]) => ({ ok: keys.every(k => v(k)), missing: keys.filter(k => !v(k)) });
  return { social: Object.fromEntries(Object.entries(SOCIAL).map(([k, p]) => [k, { label: p.label, limit: p.limit, needsMedia: p.needsMedia ?? null, ...s(p.keys) }])), cms: Object.fromEntries(Object.entries(CMS).map(([k, p]) => [k, { label: p.label, ...s(p.keys) }])) };
}
