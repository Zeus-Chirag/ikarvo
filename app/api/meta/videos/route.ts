import { NextResponse } from 'next/server';
import { fail } from '@/lib/http';
import { readUpload } from '@/lib/staged';
import { graph, isCtx, logEvent, metaCtx, metaFail, uploadAdVideo } from '@/lib/meta';
export const runtime = 'nodejs'; export const maxDuration = 300;
/** Ad account video library (/act_{id}/advideos). POST uploads an Ad Studio render (multipart "file", or JSON storagePath for files staged in Supabase Storage). */
export async function GET() {
  const ctx = await metaCtx(); if (!isCtx(ctx)) return ctx;
  try { const d = await graph<{ data: { id: string; title?: string; length?: number; picture?: string; created_time?: string; status?: { video_status?: string } }[] }>(ctx.conn.token, `${ctx.act}/advideos`, { params: { fields: 'id,title,length,picture,created_time,status', limit: 50 } });
    return NextResponse.json({ videos: d.data.map(x => ({ id: x.id, title: x.title ?? 'Untitled', length: x.length ?? null, picture: x.picture ?? null, created: x.created_time ?? null, status: x.status?.video_status ?? 'unknown' })) }); }
  catch (e) { return metaFail(e); }
}
export async function POST(req: Request) {
  const ctx = await metaCtx(); if (!isCtx(ctx)) return ctx;
  const up = await readUpload(req, ctx.actor); if (up.error) return fail(400, up.error);
  const file = up.file; if (!(file instanceof Blob) || !file.size) return fail(400, 'Attach the exported video.');
  if (!/^video\/(mp4|quicktime|webm)/.test(file.type)) return fail(415, `Meta ads need MP4 or MOV (got ${file.type || 'unknown'}). Export MP4 in Ad Studio.`);
  try { const name = String(up.get('name') || file.name || 'Ikarvo ad').slice(0, 250); const d = await uploadAdVideo(ctx.conn.token, ctx.act, file, name);
    await logEvent(ctx, 'video', d.id, 'created', { name, bytes: file.size }); return NextResponse.json({ id: d.id, name, note: 'Meta processes the video for a minute or two before it can be used in a creative.' }); }
  catch (e) { return metaFail(e); }
}
