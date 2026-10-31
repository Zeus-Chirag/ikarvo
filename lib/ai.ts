import 'server-only';
import { envValue } from '@/lib/env';

export class AiError extends Error { constructor(message: string, public status = 502) { super(message); } }

export async function chat(opts: { system: string; user: string; temperature?: number; maxTokens?: number; json?: boolean; model?: string }) {
  const key = envValue('AI_API_KEY');
  if (!key) throw new AiError('AI is not configured. Add AI_API_KEY (e.g. an OpenRouter key) to .env.local and restart.', 503);
  const base = (envValue('AI_BASE_URL') || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
  const model = opts.model || envValue('AI_MODEL') || 'openai/gpt-4o-mini';
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` };
  if (envValue('AI_HTTP_REFERER')) headers['HTTP-Referer'] = envValue('AI_HTTP_REFERER');
  if (envValue('AI_APP_TITLE')) headers['X-Title'] = envValue('AI_APP_TITLE');
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
    throw new AiError(/timeout|abort/i.test(m) ? 'The AI provider timed out. Try again or use a faster model.' : `Could not reach the AI provider: ${m}`);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new AiError(`AI provider error (${res.status}): ${data?.error?.message ?? 'unknown error'}`, res.status === 401 || res.status === 402 ? 400 : 502);
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new AiError('The AI provider returned an empty response.');
  return { content: content.trim(), model };
}

export function parseJson<T>(text: string): T {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = cleaned.indexOf('{'); const end = cleaned.lastIndexOf('}');
  if (start < 0 || end < start) throw new AiError('The AI response was not valid JSON. Try again.');
  try { return JSON.parse(cleaned.slice(start, end + 1)) as T; }
  catch { throw new AiError('The AI response was not valid JSON. Try again.'); }
}
