import { NextResponse } from 'next/server';
import { VIDEO_TARGETS, videoMissing, type VideoTarget } from '@/lib/videopub';
import { AVATAR, avatarMissing, type AvatarProvider } from '@/lib/avatar';
import { TTS, ttsMissing, type TtsProvider } from '@/lib/tts';
import { CAPTIONS, captionsMissing, type CaptionProvider } from '@/lib/captions';
import { MUSIC, musicMissing, type MusicProvider } from '@/lib/music';
import { featureStatus } from '@/lib/env';
export const dynamic = 'force-dynamic';
/** One place for Ad Studio provider readiness (no secrets, just which keys are missing). */
export async function GET() {
  const m = featureStatus().media;
  return NextResponse.json({
    targets: Object.fromEntries(Object.keys(VIDEO_TARGETS).map(k => [k, { label: VIDEO_TARGETS[k as VideoTarget].label, missing: videoMissing(k as VideoTarget) }])),
    avatar: Object.fromEntries(Object.keys(AVATAR).map(k => [k, { label: AVATAR[k as AvatarProvider].label, missing: avatarMissing(k as AvatarProvider) }])),
    tts: Object.fromEntries(Object.keys(TTS).map(k => [k, { label: TTS[k as TtsProvider].label, missing: ttsMissing(k as TtsProvider) }])),
    captions: Object.fromEntries(Object.keys(CAPTIONS).map(k => [k, { label: CAPTIONS[k as CaptionProvider].label, missing: captionsMissing(k as CaptionProvider) }])),
    music: Object.fromEntries(Object.keys(MUSIC).map(k => [k, { label: MUSIC[k as MusicProvider].label, missing: musicMissing(k as MusicProvider) }])),
    footage: { label: m.note ?? 'Replicate / fal', missing: m.missing },
  });
}
