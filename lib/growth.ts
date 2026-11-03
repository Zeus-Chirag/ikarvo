import 'server-only';
import { NextResponse } from 'next/server';
import { requireActor, consumeQuota } from '@/lib/auth';
import { chatJson, AiError } from '@/lib/ai';
import { webSearch } from '@/lib/search';
import { fail, readJson } from '@/lib/http';
import { refund } from '@/lib/credits';

export const NO_HYPE = 'Write like a sharp human operator. Be specific to this product. No invented statistics, customers, testimonials or features. Avoid: revolutionize, unlock, game-changer, elevate, seamless, cutting-edge, in today\'s fast-paced world.';

/** Shared wrapper: auth → JSON body → quota → AI JSON call → response. */
export function aiJsonRoute(build: (b: Record<string, unknown>) => { system: string; user: string; maxTokens?: number; ground?: string; validate?: (r: Record<string, unknown>) => string | null } | string) {
  return async (req: Request) => {
    const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
    const b = await readJson(req); if (!b) return fail(400, 'Request body must be JSON.');
    const spec = build(b); if (typeof spec === 'string') return fail(400, spec);
    const action = new URL(req.url).pathname.split('/').filter(Boolean).pop() ?? 'ai';
    const limited = await consumeQuota(actor, 30, action); if (limited) return limited;
    try {
      // Optional grounding: live web results the model must rely on instead of memory.
      let user = spec.user; let sources: { title: string; url: string }[] = [];
      if (spec.ground) { const hits = await webSearch(spec.ground, 8).catch(() => []); sources = hits.map(h => ({ title: h.title, url: h.url }));
        if (hits.length) user += `\n\nLIVE WEB RESULTS (today; prefer these over memory, never invent facts beyond them and the brief):\n${hits.map((h, i) => `[${i + 1}] ${h.title} — ${h.url}\n${h.snippet}`).join('\n')}`; }
      const { result, model } = await chatJson({ system: spec.system, user, validate: spec.validate, temperature: 0.6, maxTokens: spec.maxTokens ?? 4000 });
      return NextResponse.json({ result, model, ...(sources.length ? { sources } : {}) }); }
    catch (e) { await refund(actor, action); const err = e instanceof AiError ? e : new AiError(String(e)); return fail(err.status, err.message, err.status === 503 ? ['AI_API_KEY'] : undefined); }
  };
}
export const briefText = (b: unknown) => (typeof b === 'string' ? b : JSON.stringify(b ?? '')).slice(0, 8000);
