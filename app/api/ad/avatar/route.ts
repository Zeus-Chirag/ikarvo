import { NextResponse } from 'next/server';
import { requireActor, consumeQuota } from '@/lib/auth';
import { refund } from '@/lib/credits';
import { fail, notConfigured, readJson, str } from '@/lib/http';
import { AVATAR, AVATAR_INPUTS, avatarMissing, createAvatar, type AvatarProvider } from '@/lib/avatar';
export const runtime = 'nodejs'; export const maxDuration = 60;
export async function GET() { return NextResponse.json(Object.fromEntries(Object.entries(AVATAR).map(([k, p]) => [k, { label: p.label, missing: avatarMissing(k as AvatarProvider), defaultAvatar: !!(p.idKey && process.env[p.idKey]), inputs: AVATAR_INPUTS[k] }]))); }
export async function POST(req: Request) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  const b = await readJson(req); const p = String(b?.provider ?? '') as AvatarProvider;
  if (!AVATAR[p]) return fail(400, `provider must be one of ${Object.keys(AVATAR).join(', ')}.`);
  const miss = avatarMissing(p); if (miss.length) return notConfigured(AVATAR[p].label, miss);
  const script = str(b?.script, 6000); const fal = ['omnihuman', 'latentsync', 'sadtalker'].includes(p);
  // fal accepts base64 data URIs, so our in-browser voiceover and portrait can be sent directly (Vercel caps bodies at 4.5 MB).
  const audioUrl = str(b?.audioUrl, fal ? 3_000_000 : 1000); const media = str(b?.media, fal ? 3_000_000 : 1000);
  if (script.length < 5 && !audioUrl) return fail(400, 'Write the script first.');
  if (audioUrl && !/^https:\/\//.test(audioUrl) && !(fal && /^data:audio\//.test(audioUrl))) return fail(400, 'audioUrl must be a public https URL (providers download it).');
  const limited = await consumeQuota(actor, 30, 'avatar'); if (limited) return limited;
  try { return NextResponse.json(await createAvatar(p, { script, audioUrl: audioUrl || undefined, aspect: str(b?.aspect, 8) || '9:16', avatar: str(b?.avatar, 120) || undefined, voice: str(b?.voice, 120) || undefined, background: str(b?.background, 40) || undefined, title: str(b?.title, 120) || undefined, media: media || undefined })); }
  catch (e) { await refund(actor, 'avatar'); const s = (e as { status?: number }).status ?? 502; return fail(s, e instanceof Error ? e.message : String(e)); }
}
