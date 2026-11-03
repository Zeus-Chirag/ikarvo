import 'server-only';
import { envValue } from '@/lib/env';

export class AiError extends Error { constructor(message: string, public status = 502) { super(message); } }

export async function chat(opts: { system: string; user: string; temperature?: number; maxTokens?: number; json?: boolean; model?: string }) {
  const key = envValue('AI_API_KEY');
  if (!key) throw new AiError('AI generation is coming soon. We will email you when it is switched on for your workspace.', 503);
  const base = (envValue('AI_BASE_URL') || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
  const gemini = base.includes('generativelanguage.googleapis.com');
  const fallback = gemini ? 'gemini-3.5-flash' : 'openai/gpt-4o-mini';
  // Gemini's OpenAI-compatible endpoint only knows bare gemini-* ids: strip "google/" and ignore other vendors' ids.
  const norm = (m?: string) => { if (!m) return ''; if (!gemini) return m; const id = m.replace(/^(google|models)\//, ''); return /^gemini-/.test(id) ? id : ''; };
  const primary = norm(opts.model) || norm(envValue('AI_MODEL')) || fallback;
  const chain = [primary, ...(envValue('AI_FALLBACK_MODELS') || '').split(',').map(x => norm(x.trim())).filter(Boolean)].filter((m, i, a) => a.indexOf(m) === i);
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` };
  if (envValue('AI_HTTP_REFERER')) headers['HTTP-Referer'] = envValue('AI_HTTP_REFERER');
  if (envValue('AI_APP_TITLE')) headers['X-Title'] = envValue('AI_APP_TITLE');
  let last: AiError | null = null;
  for (const model of chain) {
    let res: Response;
    try {
      res = await fetch(`${base}/chat/completions`, {
        method: 'POST', headers, signal: AbortSignal.timeout(90_000),
        body: JSON.stringify({ model, temperature: opts.temperature ?? 0.5, max_tokens: opts.maxTokens ?? 3000,
          ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
          messages: [{ role: 'system', content: opts.system }, { role: 'user', content: opts.user }] }),
      });
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      last = new AiError(/timeout|abort/i.test(m) ? 'The AI took too long to answer. Please try again.' : 'Could not reach the AI service. Please try again in a moment.');
      continue;
    }
    const data = await res.json().catch(() => ({}));
    const err = Array.isArray(data) ? data[0]?.error : data?.error;
    if (res.status === 429 || res.status === 503 || res.status === 404 || res.status >= 500) {
      // Busy, rate-limited or retired model: try the next model in the chain.
      last = new AiError(res.status === 429 ? 'Our AI is getting a lot of requests right now. Please wait a minute and try again.' : 'The AI service is busy right now. Please try again in a minute.', res.status === 429 ? 429 : 503);
      continue;
    }
    if (!res.ok) throw new AiError(res.status === 401 || res.status === 403 ? 'AI is temporarily unavailable. We are on it, please try again later.' : `The AI could not complete this request (${res.status}). ${err?.message ? String(err.message).slice(0, 160) : ''}`.trim(), res.status === 400 ? 400 : 502);
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) { last = new AiError('The AI returned an empty response. Please try again.'); continue; }
    return { content: content.trim(), model };
  }
  throw last ?? new AiError('The AI service is busy right now. Please try again in a minute.', 503);
}

export function parseJson<T>(text: string): T {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = cleaned.indexOf('{'); const end = cleaned.lastIndexOf('}');
  if (start < 0 || end < start) throw new AiError('The AI response was not valid JSON. Try again.');
  try { return JSON.parse(cleaned.slice(start, end + 1)) as T; }
  catch { throw new AiError('The AI response was not valid JSON. Try again.'); }
}
