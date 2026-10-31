import { NextResponse } from 'next/server';
import { requireActor } from '@/lib/auth';
import { fail } from '@/lib/http';
import { normalizeUrl, safeFetch } from '@/lib/site';
export const runtime = 'nodejs'; export const maxDuration = 60;
/**
 * Same-origin pass-through for provider media (avatar videos, generated clips, product images) so the browser
 * renderer can draw them into a canvas without tainting it. SSRF-guarded, media types only, 200 MB cap.
 */
export async function GET(req: Request) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  const raw = new URL(req.url).searchParams.get('url') ?? '';
  let u: URL; try { u = normalizeUrl(raw); if (u.protocol !== 'https:') throw new Error(); } catch { return fail(400, 'url must be https.'); }
  try {
    const { res } = await safeFetch(u, 45000, 3, { headers: { Accept: 'video/*,image/*,audio/*' } });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok) return fail(502, `Source returned ${res.status}.`);
    if (!/^(video|image|audio)\//.test(type) && type !== 'application/octet-stream' && type !== 'binary/octet-stream') return fail(415, `Not a media file (${type || 'unknown type'}).`);
    const len = Number(res.headers.get('content-length') ?? 0); if (len > 200e6) return fail(413, 'File is larger than 200 MB.');
    return new NextResponse(res.body, { headers: { 'Content-Type': type || 'application/octet-stream', 'Cache-Control': 'private, max-age=3600', ...(len ? { 'Content-Length': String(len) } : {}) } });
  } catch (e) { return fail(502, e instanceof Error ? e.message : String(e)); }
}
