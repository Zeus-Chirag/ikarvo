import { NextResponse } from 'next/server';
import { requireActor } from '@/lib/auth';
import { fail, readJson, str } from '@/lib/http';
import { stagedPath, UPLOAD_BUCKET, UPLOAD_MAX_BYTES } from '@/lib/staged';
/** Issue a one-time signed upload URL into the private media-uploads bucket, under the caller's own folder. */
export async function POST(req: Request) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  if (!actor.supabase) return fail(400, 'Direct uploads need Supabase Storage; preview mode posts files to the local server instead.');
  const b = await readJson(req); const name = str(b?.name, 200) || 'upload.bin'; const size = Number(b?.size) || 0; const type = str(b?.type, 100);
  if (!/^(video|image)\//.test(type)) return fail(415, 'Only video and image uploads are accepted.');
  if (size > UPLOAD_MAX_BYTES) return fail(413, `File is ${(size / 1048576).toFixed(1)} MB; the upload limit is ${UPLOAD_MAX_BYTES / 1048576} MB.`);
  const path = stagedPath(actor, name);
  const { data, error } = await actor.supabase.storage.from(UPLOAD_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return fail(502, `Storage refused the upload: ${error?.message ?? 'unknown'}. Has the media-uploads migration been applied?`);
  return NextResponse.json({ bucket: UPLOAD_BUCKET, path: data.path, token: data.token });
}
