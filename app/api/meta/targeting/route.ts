import { NextResponse } from 'next/server';
import { consumeQuota } from '@/lib/auth';
import { readJson, str, fail } from '@/lib/http';
import { chat, parseJson, AiError } from '@/lib/ai';
import { graph, isCtx, metaCtx, metaFail } from '@/lib/meta';
export const runtime = 'nodejs'; export const maxDuration = 120;
type Plan = { summary: string; interests: string[]; locations: string[]; ageMin: number; ageMax: number; genders: 'all' | 'male' | 'female'; demographics: string[]; lookalikeSeed: string; rationale: string[] };
type Interest = { id: string; name: string; audience_size_lower_bound?: number; audience_size_upper_bound?: number; path?: string[]; topic?: string };
type Geo = { key: string; name: string; type: string; country_code?: string; country_name?: string; region?: string };
/**
 * AI CMO: product brief → audience plan → every interest/location/demographic resolved to a REAL Meta targeting id
 * through the targeting search API. Anything Meta can't resolve is reported as dropped, never invented.
 */
export async function POST(req: Request) {
  const ctx = await metaCtx({ needAccount: false }); if (!isCtx(ctx)) return ctx;
  const b = await readJson<{ product?: string; audience?: string; markets?: string }>(req); const product = str(b?.product, 3000);
  if (product.length < 20) return fail(400, 'Describe the product or app you are promoting (at least a sentence).');
  const q = await consumeQuota(ctx.actor, 30, 'meta_targeting'); if (q) return q;
  let plan: Plan;
  try {
    const r = await chat({ json: true, temperature: 0.4, maxTokens: 1200, system: `You are the paid-social strategist of Ikarvo's AI CMO, building Meta (Facebook/Instagram) ad targeting.
Return strict JSON: {"summary": string, "interests": [6-10 short Meta interest names people actually follow, e.g. brands, publications, hobbies, job topics], "locations": [1-4 country or city names], "ageMin": 18-65, "ageMax": 18-65, "genders": "all"|"male"|"female", "demographics": [0-3 Meta demographic category names such as "Small business owners" or job titles], "lookalikeSeed": string (which first-party list to seed a 1% lookalike with), "rationale": [3 short bullets]}.
Prefer broad-but-relevant interests over tiny niches; do not invent audience sizes.`,
      user: `Product / app:\n${product}\n\nTarget customer (optional): ${str(b?.audience, 600) || 'infer it'}\nMarkets (optional): ${str(b?.markets, 200) || 'infer from the product, default United States'}` });
    plan = parseJson<Plan>(r.content);
  } catch (e) { if (e instanceof AiError) return fail(e.status, e.message, e.status === 503 ? ['AI_API_KEY'] : undefined); return fail(502, String(e)); }
  try {
    const t = ctx.conn.token; const pick = <T,>(xs: T[]) => xs[0];
    const interests = await Promise.all((plan.interests ?? []).slice(0, 10).map(async name => ({ query: name, match: pick((await graph<{ data: Interest[] }>(t, 'search', { params: { type: 'adinterest', q: name, limit: 3 } })).data) ?? null })));
    const locations = await Promise.all((plan.locations ?? []).slice(0, 4).map(async name => ({ query: name, match: pick((await graph<{ data: Geo[] }>(t, 'search', { params: { type: 'adgeolocation', q: name, location_types: ['country', 'city', 'region'], limit: 3 } })).data) ?? null })));
    const demoAll = (plan.demographics ?? []).length ? (await graph<{ data: { id: string; name: string; type: string; audience_size_lower_bound?: number; audience_size_upper_bound?: number }[] }>(t, 'search', { params: { type: 'adTargetingCategory', class: 'demographics', limit: 500 } })).data : [];
    const demographics = (plan.demographics ?? []).slice(0, 3).map(name => ({ query: name, match: demoAll.find(d => d.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(d.name.toLowerCase())) ?? null }));
    const ageMin = Math.max(18, Math.min(65, Number(plan.ageMin) || 18)); const ageMax = Math.max(ageMin, Math.min(65, Number(plan.ageMax) || 65));
    return NextResponse.json({ plan: { summary: plan.summary, rationale: plan.rationale ?? [], lookalikeSeed: plan.lookalikeSeed ?? '' }, ageMin, ageMax, genders: plan.genders === 'male' ? [1] : plan.genders === 'female' ? [2] : [],
      interests, locations, demographics });
  } catch (e) { return metaFail(e); }
}
