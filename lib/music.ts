import 'server-only';
import { envValue as v } from '@/lib/env';
/** Music beds. ElevenLabs Music (POST /v1/music → mp3 bytes) or Stable Audio on fal (fal-ai/stable-audio → audio_file.url). */
export const MUSIC = {
  elevenlabs: { label: 'ElevenLabs Music', keys: ['ELEVENLABS_API_KEY'] },
  stableaudio: { label: 'Stable Audio (fal)', keys: ['FAL_KEY'] },
} as const;
export type MusicProvider = keyof typeof MUSIC;
export const musicMissing = (p: MusicProvider) => MUSIC[p].keys.filter(k => !v(k));

export async function compose(p: MusicProvider, prompt: string, seconds: number): Promise<{ audio: string; provider: MusicProvider }> {
  const s = Math.max(5, Math.min(47, Math.round(seconds)));
  if (p === 'elevenlabs') {
    const r = await fetch('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128', { method: 'POST', headers: { 'xi-api-key': v('ELEVENLABS_API_KEY'), 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, music_length_ms: s * 1000 }) });
    if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(`ElevenLabs Music error (${r.status}): ${d?.detail?.message ?? JSON.stringify(d?.detail ?? 'request failed').slice(0, 200)}`); }
    return { provider: p, audio: `data:audio/mpeg;base64,${Buffer.from(await r.arrayBuffer()).toString('base64')}` };
  }
  const r = await fetch('https://fal.run/fal-ai/stable-audio', { method: 'POST', headers: { Authorization: `Key ${v('FAL_KEY')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, seconds_total: s }) });
  const d = await r.json().catch(() => ({})); if (!r.ok || !d?.audio_file?.url) throw new Error(`Stable Audio error (${r.status}): ${JSON.stringify(d?.detail ?? 'no audio returned').slice(0, 200)}`);
  return { provider: p, audio: d.audio_file.url };
}
