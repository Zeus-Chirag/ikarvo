import 'server-only';
import { envValue as v } from '@/lib/env';
import type { Word } from '@/lib/tts';
/**
 * Auto-captions. OpenAI Whisper (POST /audio/transcriptions, whisper-1, verbose_json + word timestamps) gives per-word timing.
 * fal Wizper (fal-ai/wizper, Whisper v3 large) returns segment chunks; words inside a chunk are spread evenly (marked approximate).
 */
export const CAPTIONS = {
  whisper: { label: 'OpenAI Whisper', keys: ['OPENAI_API_KEY'] },
  wizper: { label: 'Wizper (fal, Whisper v3)', keys: ['FAL_KEY'] },
} as const;
export type CaptionProvider = keyof typeof CAPTIONS;
export const captionsMissing = (p: CaptionProvider) => CAPTIONS[p].keys.filter(k => !v(k));
export type CaptionResult = { provider: CaptionProvider; text: string; words: Word[]; exact: boolean };

function split(text: string, s: number, e: number): Word[] { const ws = text.trim().split(/\s+/).filter(Boolean); const d = (e - s) / Math.max(1, ws.length); return ws.map((w, i) => ({ w, start: s + i * d, end: s + (i + 1) * d })); }

export async function transcribe(p: CaptionProvider, audio: string, language?: string): Promise<CaptionResult> {
  if (p === 'whisper') {
    const m = /^data:([^;]+);base64,(.+)$/.exec(audio); if (!m) throw Object.assign(new Error('Whisper needs the audio as a data URL.'), { status: 400 });
    const fd = new FormData(); fd.append('file', new Blob([Buffer.from(m[2], 'base64')], { type: m[1] }), `audio.${m[1].split('/')[1]?.replace('mpeg', 'mp3') || 'mp3'}`);
    fd.append('model', 'whisper-1'); fd.append('response_format', 'verbose_json'); fd.append('timestamp_granularities[]', 'word'); if (language) fd.append('language', language);
    const r = await fetch(`${(v('OPENAI_BASE_URL') || 'https://api.openai.com/v1').replace(/\/+$/, '')}/audio/transcriptions`, { method: 'POST', headers: { Authorization: `Bearer ${v('OPENAI_API_KEY')}` }, body: fd });
    const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(`Whisper error (${r.status}): ${d?.error?.message ?? 'request failed'}`);
    return { provider: p, text: d.text ?? '', exact: true, words: (d.words ?? []).map((w: { word: string; start: number; end: number }) => ({ w: w.word, start: w.start, end: w.end })) };
  }
  const r = await fetch('https://fal.run/fal-ai/wizper', { method: 'POST', headers: { Authorization: `Key ${v('FAL_KEY')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ audio_url: audio, task: 'transcribe', chunk_level: 'segment', language: language || 'en' }) });
  const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(`fal Wizper error (${r.status}): ${JSON.stringify(d?.detail ?? 'request failed').slice(0, 300)}`);
  const words = (d.chunks ?? []).flatMap((c: { text: string; timestamp: [number, number] }) => split(c.text, c.timestamp?.[0] ?? 0, c.timestamp?.[1] ?? 0));
  return { provider: p, text: d.text ?? '', exact: false, words };
}
