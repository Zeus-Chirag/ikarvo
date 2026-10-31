import 'server-only';
import { envValue as v } from '@/lib/env';
/** Voiceover providers. ElevenLabs returns character timings (exact captions); OpenAI does not (captions are estimated). */
export const TTS = {
  elevenlabs: { label: 'ElevenLabs', keys: ['ELEVENLABS_API_KEY'] },
  openai: { label: 'OpenAI TTS', keys: ['OPENAI_API_KEY'] },
} as const;
export type TtsProvider = keyof typeof TTS;
export const ttsMissing = (p: TtsProvider) => TTS[p].keys.filter(k => !v(k));
export type Word = { w: string; start: number; end: number };
export type TtsResult = { audio: string; mime: string; words: Word[] | null; provider: TtsProvider };

function wordsFromChars(chars: string[], starts: number[], ends: number[]): Word[] {
  const out: Word[] = []; let cur = ''; let s = 0;
  chars.forEach((c, i) => { if (/\s/.test(c)) { if (cur) out.push({ w: cur, start: s, end: ends[i - 1] ?? starts[i] }); cur = ''; } else { if (!cur) s = starts[i]; cur += c; } });
  if (cur) out.push({ w: cur, start: s, end: ends[ends.length - 1] }); return out;
}
export async function speak(provider: TtsProvider, text: string, voice?: string): Promise<TtsResult> {
  if (provider === 'elevenlabs') {
    const id = voice || v('ELEVENLABS_VOICE_ID') || 'JBFqnCBsd6RMkjVDRZzb';
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(id)}/with-timestamps?output_format=mp3_44100_128`, { method: 'POST',
      headers: { 'xi-api-key': v('ELEVENLABS_API_KEY'), 'Content-Type': 'application/json' }, body: JSON.stringify({ text, model_id: v('ELEVENLABS_MODEL') || 'eleven_multilingual_v2' }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`ElevenLabs error (${r.status}): ${d?.detail?.message ?? d?.detail ?? 'request failed'}`);
    const a = d.alignment ?? d.normalized_alignment;
    return { audio: `data:audio/mpeg;base64,${d.audio_base64}`, mime: 'audio/mpeg', provider, words: a ? wordsFromChars(a.characters, a.character_start_times_seconds, a.character_end_times_seconds) : null };
  }
  const r = await fetch(`${(v('OPENAI_BASE_URL') || 'https://api.openai.com/v1').replace(/\/+$/, '')}/audio/speech`, { method: 'POST',
    headers: { Authorization: `Bearer ${v('OPENAI_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: v('OPENAI_TTS_MODEL') || 'gpt-4o-mini-tts', voice: voice || v('OPENAI_TTS_VOICE') || 'marin', input: text, response_format: 'mp3', instructions: 'Natural, conversational, like a real customer talking to their phone camera. Not salesy.' }) });
  if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(`OpenAI TTS error (${r.status}): ${d?.error?.message ?? 'request failed'}`); }
  return { audio: `data:audio/mpeg;base64,${Buffer.from(await r.arrayBuffer()).toString('base64')}`, mime: 'audio/mpeg', provider, words: null };
}
