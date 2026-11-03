import 'server-only';
import { envValue as v } from '@/lib/env';
/** Voiceover providers. ElevenLabs returns character timings (exact captions); OpenAI does not (captions are estimated). */
export const TTS = {
  gemini: { label: 'Gemini voice (free tier)', keys: [] as string[] },
  elevenlabs: { label: 'ElevenLabs', keys: ['ELEVENLABS_API_KEY'] },
  openai: { label: 'OpenAI TTS', keys: ['OPENAI_API_KEY'] },
} as const;
export type TtsProvider = keyof typeof TTS;
const geminiKey = () => v('GEMINI_API_KEY') || (/generativelanguage/.test(v('AI_BASE_URL')) ? v('AI_API_KEY') : '');
export const ttsMissing = (p: TtsProvider) => p === 'gemini' ? (geminiKey() ? [] : ['GEMINI_API_KEY']) : TTS[p].keys.filter(k => !v(k));
/** Gemini returns raw 16-bit PCM; wrap it in a WAV header so browsers and ffmpeg can play it. */
function wav(pcm: Buffer, rate: number) { const h = Buffer.alloc(44); h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40); return Buffer.concat([h, pcm]); }
export const GEMINI_VOICES = ['Kore', 'Puck', 'Aoede', 'Charon', 'Leda', 'Fenrir', 'Zephyr', 'Sulafat', 'Achird', 'Laomedeia'];
async function geminiSpeak(text: string, voice?: string): Promise<TtsResult> {
  const name = voice && GEMINI_VOICES.includes(voice) ? voice : (v('GEMINI_TTS_VOICE') || 'Kore');
  const prompt = `Read this like a real customer filming a casual selfie video on their phone: natural, warm, conversational, a little enthusiastic but not salesy, with natural pauses. Read exactly these words:\n\n${text}`;
  let last = '';
  for (const model of [v('GEMINI_TTS_MODEL') || 'gemini-2.5-flash-preview-tts', 'gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts']) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: 'POST', signal: AbortSignal.timeout(55_000),
      headers: { 'x-goog-api-key': geminiKey(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: name } } } } }) }).catch(e => { last = String(e); return null; });
    if (!r) continue; const d = await r.json().catch(() => ({}));
    const part = d?.candidates?.[0]?.content?.parts?.find((p: { inlineData?: { data?: string } }) => p.inlineData?.data)?.inlineData;
    if (!r.ok || !part) { last = `${r.status} ${d?.error?.message ?? 'no audio'}`.slice(0, 160); continue; }
    const rate = Number(/rate=(\d+)/.exec(part.mimeType ?? '')?.[1] ?? 24000);
    return { audio: `data:audio/wav;base64,${wav(Buffer.from(part.data, 'base64'), rate).toString('base64')}`, mime: 'audio/wav', provider: 'gemini', words: null };
  }
  throw new Error(`Gemini voice error: ${last}`);
}
export type Word = { w: string; start: number; end: number };
export type TtsResult = { audio: string; mime: string; words: Word[] | null; provider: TtsProvider };

function wordsFromChars(chars: string[], starts: number[], ends: number[]): Word[] {
  const out: Word[] = []; let cur = ''; let s = 0;
  chars.forEach((c, i) => { if (/\s/.test(c)) { if (cur) out.push({ w: cur, start: s, end: ends[i - 1] ?? starts[i] }); cur = ''; } else { if (!cur) s = starts[i]; cur += c; } });
  if (cur) out.push({ w: cur, start: s, end: ends[ends.length - 1] }); return out;
}
export async function speak(provider: TtsProvider, text: string, voice?: string): Promise<TtsResult> {
  if (provider === 'gemini') return geminiSpeak(text, voice);
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
