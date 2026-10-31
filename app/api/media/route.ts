import { refund } from '@/lib/credits';
import { NextResponse } from 'next/server';
import { requireActor, consumeQuota } from '@/lib/auth';
import { createJob, type MediaKind } from '@/lib/media';
import { fail, notConfigured, readJson, str } from '@/lib/http';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  const b = await readJson(req); if (!b) return fail(400, 'Request body must be JSON.');
  const kind = (b.kind === 'video' ? 'video' : 'image') as MediaKind;
  const prompt = str(b.prompt, 1500); if (prompt.length < 5) return fail(400, 'Write a visual prompt first.');
  const aspect = ['9:16', '1:1', '16:9'].includes(String(b.aspect)) ? String(b.aspect) : '9:16';
  const limited = await consumeQuota(actor, 30, 'media'); if (limited) return limited;
  try { return NextResponse.json(await createJob(kind, prompt, aspect)); }
  catch (e) {
    await refund(actor, 'media');
    const m = e instanceof Error ? e.message : String(e);
    return m === 'NOT_CONFIGURED' ? notConfigured('AI image/video generation', ['REPLICATE_API_TOKEN or FAL_KEY']) : fail(502, m);
  }
}
