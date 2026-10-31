import { refund } from '@/lib/credits';
import { NextResponse } from 'next/server';
import { requireActor, consumeQuota } from '@/lib/auth';
import { chat, AiError } from '@/lib/ai';
import { envValue } from '@/lib/env';
import { fail, readJson, str } from '@/lib/http';
export const runtime = 'nodejs';
export const maxDuration = 180;

type Answer = { content: string; citations: string[]; engine: string };
const SYS = "You are a helpful assistant. Answer the user's question directly, naming specific products or companies where relevant.";

/** Search-grounded answer: Perplexity Sonar if PERPLEXITY_API_KEY, else OpenRouter's ':online' web plugin. */
async function grounded(prompt: string, model: string): Promise<Answer> {
  if (envValue('PERPLEXITY_API_KEY')) {
    const m = envValue('PERPLEXITY_MODEL') || 'sonar';
    const r = await fetch('https://api.perplexity.ai/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${envValue('PERPLEXITY_API_KEY')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: m, messages: [{ role: 'system', content: SYS }, { role: 'user', content: prompt }] }), signal: AbortSignal.timeout(60000) });
    const d = await r.json().catch(() => ({})); if (!r.ok) throw new AiError(`Perplexity error (${r.status}): ${d?.error?.message ?? ''}`);
    return { content: d.choices?.[0]?.message?.content ?? '', citations: d.citations ?? (d.search_results ?? []).map((s: { url: string }) => s.url), engine: `perplexity/${m}` };
  }
  const base = (envValue('AI_BASE_URL') || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
  if (!base.includes('openrouter.ai')) throw new AiError('Search-grounded checks need PERPLEXITY_API_KEY, or AI_BASE_URL pointing at OpenRouter (uses its :online web search).', 503);
  if (!envValue('AI_API_KEY')) throw new AiError('AI_API_KEY is required.', 503);
  const r = await fetch(`${base}/chat/completions`, { method: 'POST', headers: { Authorization: `Bearer ${envValue('AI_API_KEY')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: `${model.replace(/:online$/, '')}:online`, max_tokens: 900, messages: [{ role: 'system', content: SYS }, { role: 'user', content: prompt }] }), signal: AbortSignal.timeout(90000) });
  const d = await r.json().catch(() => ({})); if (!r.ok) throw new AiError(`OpenRouter error (${r.status}): ${d?.error?.message ?? ''}`);
  const msg = d.choices?.[0]?.message ?? {};
  return { content: msg.content ?? '', citations: (msg.annotations ?? []).filter((a: { type: string }) => a.type === 'url_citation').map((a: { url_citation: { url: string } }) => a.url_citation.url), engine: `${model}:online` };
}

export async function POST(req: Request) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  const b = await readJson(req); if (!b) return fail(400, 'Request body must be JSON.');
  const brand = str(b.brand, 80); if (!brand) return fail(400, 'Enter your brand name.');
  const prompts = (Array.isArray(b.prompts) ? b.prompts : []).map(p => str(p, 300)).filter(Boolean).slice(0, 15);
  if (!prompts.length) return fail(400, 'Add at least one prompt to track.');
  const competitors = (Array.isArray(b.competitors) ? b.competitors : []).map(c => str(c, 60)).filter(Boolean).slice(0, 8);
  const domain = str(b.domain, 200).replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
  const ownPages = new Set((Array.isArray(b.pages) ? b.pages : []).map(p => String(p).replace(/\/+$/, '')));
  const isGrounded = !!b.grounded;
  const models = (envValue('VISIBILITY_MODELS') || envValue('AI_MODEL') || 'openai/gpt-4o-mini').split(',').map(s => s.trim()).filter(Boolean).slice(0, isGrounded && envValue('PERPLEXITY_API_KEY') ? 1 : 4);
  const limited = await consumeQuota(actor, 30, 'visibility'); if (limited) return limited;
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const find = (text: string, name: string) => { const m = new RegExp(`\\b${esc(name)}\\b`, 'i').exec(text); return m ? m.index : -1; };
  try {
    const results = [];
    for (const prompt of prompts) for (const model of models) {
      const a: Answer = isGrounded ? await grounded(prompt, model) : { ...(await chat({ system: SYS, user: prompt, temperature: 0.2, maxTokens: 700, model })), citations: [], engine: model };
      const pos = find(a.content, brand);
      const citedOwn = a.citations.filter(u => { try { return new URL(u).hostname.replace(/^www\./, '').endsWith(domain) && !!domain; } catch { return false; } });
      results.push({ prompt, model: a.engine, mentioned: pos >= 0, position: pos >= 0 ? a.content.slice(0, pos).split(/\n\s*\n|\n\d+\.|\n[-*] /).length : null,
        competitors: competitors.map(c => ({ name: c, mentioned: find(a.content, c) >= 0 })), excerpt: a.content.slice(0, 1500),
        citations: a.citations.slice(0, 12), cited: citedOwn.length > 0, citedPages: citedOwn.filter(u => ownPages.has(u.replace(/\/+$/, ''))) });
    }
    const share = results.filter(r => r.mentioned).length / results.length;
    return NextResponse.json({ results, share, citedShare: isGrounded ? results.filter(r => r.cited).length / results.length : null, grounded: isGrounded, models: [...new Set(results.map(r => r.model))], checkedAt: new Date().toISOString() });
  } catch (e) { await refund(actor, 'visibility'); const err = e instanceof AiError ? e : new AiError(String(e)); return fail(err.status, err.message, err.status === 503 ? ['AI_API_KEY', 'PERPLEXITY_API_KEY (for grounded)'] : undefined); }
}
