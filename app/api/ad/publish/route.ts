import { NextResponse } from 'next/server';
import { requireActor } from '@/lib/auth';
import { fail, notConfigured } from '@/lib/http';
import { readUpload } from '@/lib/staged';
import { SetupError, uploadVideo, VIDEO_TARGETS, videoMissing, type VideoTarget } from '@/lib/videopub';
export const runtime = 'nodejs'; export const maxDuration = 300;
/**
 * Upload a rendered ad (multipart: file, target, title, description, privacy).
 * Files over 4 MB are uploaded by the browser straight to Supabase Storage (signed URL) and arrive here as JSON { storagePath },
 * which avoids Vercel's 4.5 MB request body cap.
 */
export async function POST(req: Request) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  const up = await readUpload(req, actor); if (up.error) return fail(400, up.error); const form = { get: up.get };
  const t = String(form.get('target') ?? '') as VideoTarget; if (!VIDEO_TARGETS[t]) return fail(400, `target must be one of ${Object.keys(VIDEO_TARGETS).join(', ')}.`);
  const miss = videoMissing(t); if (miss.length) return notConfigured(VIDEO_TARGETS[t].label, miss);
  const file = up.file; if (!file || !file.size) return fail(400, 'Attach the exported video.');
  if (!/^video\/(mp4|webm|quicktime)/.test(file.type)) return fail(415, `Unsupported type ${file.type || 'unknown'}; export MP4 first.`);
  if (t === 'tiktok' && !/mp4|quicktime|webm/.test(file.type)) return fail(415, 'TikTok accepts MP4, WebM or MOV.');
  try {
    return NextResponse.json(await uploadVideo(t, { file, name: file.name || 'ad.mp4', title: String(form.get('title') ?? 'Ad').slice(0, 250), description: String(form.get('description') ?? '').slice(0, 5000), privacy: String(form.get('privacy') ?? 'private') }));
  } catch (e) {
    if (e instanceof SetupError) return fail(e.keys.length ? 503 : 401, e.message, e.keys);
    return fail(502, e instanceof Error ? e.message : String(e));
  }
}
