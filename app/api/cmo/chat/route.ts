import { NextResponse } from 'next/server';
import { requireActor, consumeQuota } from '@/lib/auth';
import { chat, parseJson, AiError } from '@/lib/ai';
import { refund } from '@/lib/credits';
import { NO_HYPE, briefText } from '@/lib/growth';
import { fail, readJson, str } from '@/lib/http';
import { webSearch } from '@/lib/search';
import { hn, reddit, INTENT } from '@/lib/community';
import { normalizeUrl, safeFetch } from '@/lib/site';

type Call = { name: string; args?: Record<string, unknown> };
const TOOLS = `TOOLS you can call (live data; use them instead of guessing whenever the user asks about competitors, the market, threads, links, rankings or their site):
- web_search {"q": string} — live web results
- find_competitors {"name"?: string, "category"?: string} — searches the web for alternatives/competitors of the product
- community_search {"query": string, "days"?: number} — recent Reddit + Hacker News threads
- backlink_search {"topic": string} — guest-post, resource-page, listicle and directory opportunities
- read_site {"url": string} — fetch a page (title, description, headings, text excerpt)
To call tools, return ONLY {"tool_calls":[{"name":..., "args":{...}}]} (max 3). After you get TOOL RESULTS, answer normally and cite URLs from them.`;
const clip = (x: unknown, n = 3500) => JSON.stringify(x).slice(0, n);
async function runTool(c: Call, brief: { name?: string; category?: string }): Promise<string> {
  const a = c.args ?? {}; const s = (k: string, n = 200) => str(a[k], n);
  try {
    if (c.name === 'web_search') return clip(await webSearch(s('q') || brief.name || '', 8));
    if (c.name === 'find_competitors') { const n = s('name') || brief.name || '', cat = s('category') || brief.category || '';
      const hits = (await Promise.all([`${n} alternatives`, `${n} competitors`, `best ${cat || n} tools`].map(q => webSearch(q, 8).catch(() => [])))).flat(); return clip(hits, 6000); }
    if (c.name === 'community_search') { const q = s('query') || brief.name || ''; const d = Math.min(365, Math.max(1, Number(a.days) || 30));
      const [h, r] = await Promise.allSettled([hn(q, d), reddit(q, d)]); const t = [...(h.status === 'fulfilled' ? h.value : []), ...(r.status === 'fulfilled' ? r.value : [])].map(x => ({ src: x.community, title: x.title, url: x.url, intent: INTENT.test(`${x.title} ${x.text}`), at: x.createdAt.slice(0, 10) }));
      return clip(t.sort((x, y) => Number(y.intent) - Number(x.intent)).slice(0, 20)); }
    if (c.name === 'backlink_search') { const t = s('topic') || brief.category || brief.name || '';
      const hits = (await Promise.all([`"${t}" "write for us"`, `${t} intitle:resources`, `best ${t} tools`, `${t} "submit your tool"`].map(q => webSearch(q, 6).catch(() => [])))).flat(); return clip(hits, 5000); }
    if (c.name === 'read_site') { const { res, url } = await safeFetch(normalizeUrl(s('url', 300)), 10000); const html = (await res.text()).slice(0, 800_000);
      const txt = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      return clip({ url: url.toString(), status: res.status, title: html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim(), text: txt.slice(0, 2500) }); }
    return `unknown tool ${c.name}`;
  } catch (e) { return `error: ${e instanceof Error ? e.message : String(e)}`; }
}
export const runtime = 'nodejs';
export const maxDuration = 120;
const KINDS = 'build|ad|post|article|campaign|tab';
const TABS = 'strategy,crawl,visibility,competitors,community,articles,campaign,listing,voice,calendar,influencers,backlinks,analytics,report,ugc,tools,meta';
/** AI CMO chat. Grounded in the user's documents, memories, skills and settings. Returns a reply plus optional one-click actions. */
export async function POST(req: Request) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  const b = await readJson(req); if (!b) return fail(400, 'Request body must be JSON.');
  const msgs = (Array.isArray(b.messages) ? b.messages : []).slice(-12).map((m: { role?: string; content?: string }) => `${m.role === 'user' ? 'USER' : 'CMO'}: ${str(m.content, 3000)}`);
  if (!msgs.length) return fail(400, 'Say something first.');
  const limited = await consumeQuota(actor, 30, 'chat'); if (limited) return limited;
  try {
    const pr = (b.product && typeof b.product === 'object' ? b.product : {}) as Record<string, unknown>;
    const ask = (extra: string) => chat({ json: true, temperature: 0.5, maxTokens: 1800,
      system: `You are the user's AI CMO inside Ikarvo. ${NO_HYPE} Ground every answer in the CONTEXT; if something is missing, say which document or connection would fix it. You never publish or send anything; you propose actions the user clicks. Saved agent RESULTS in the context are what the user's agents already found; use them and refer to them.\n${TOOLS}
For paid social, the "meta" tab runs real Meta (Facebook/Instagram) ads: AI audience targeting resolved via Meta's targeting search, reach estimates, Ad Studio videos as creatives, campaigns created PAUSED, insights (spend, reach, CTR, CPA) and optimisation advice. Suggest it with kind "tab", tab "meta" when the user asks about ads; launching always needs their explicit confirmation there.
Language: ${str(b.language, 40) || 'English'}. Address the user as ${str(b.callMe, 50) || 'you'}${str(b.role, 100) ? ` (${str(b.role, 100)})` : ''}.
Return strict JSON: {"reply": markdown string, "actions": [{"label": string, "kind": "${KINDS}", "prompt"?: string, "angle"?: string, "text"?: string, "channel"?: string, "topic"?: string, "goal"?: string, "tab"?: one of ${TABS}}] (0-3 items, only when genuinely useful), "suggestions": [3 short follow-up questions], "memory": string|null (one durable fact about the user/business worth remembering, else null)}`,
      user: `CONTEXT\nBrief:\n${briefText(b.brief)}\n\nDocuments (${str(b.focus, 100) ? `user pointed at: ${str(b.focus, 100)}` : 'all'}):\n${briefText(b.docs).slice(0, 9000)}\n\nMemories:\n${briefText(b.memories).slice(0, 2000)}\nSkills:\n${briefText(b.skills).slice(0, 3000)}\nAgent settings:\n${briefText(b.agents).slice(0, 1500)}\nRESULTS (saved agent output):\n${briefText(b.results).slice(0, 5000)}\nAbout the user: ${str(b.about, 3000)}\nProduct: ${str(pr.name, 100)} | category: ${str(pr.category, 100)} | site: ${str(pr.url, 200)}\n\nCONVERSATION\n${msgs.join('\n')}${extra}` });
    const bp = { name: str(pr.name, 100), category: str(pr.category, 100) };
    let { content, model } = await ask(''); const used: { name: string; args?: unknown }[] = []; let extra = '';
    for (let round = 0; round < 2; round++) {
      let calls: Call[] = []; try { calls = (parseJson<{ tool_calls?: Call[] }>(content).tool_calls ?? []).filter(c => c && typeof c.name === 'string').slice(0, 3); } catch { break; }
      if (!calls.length) break;
      const out = await Promise.all(calls.map(c => runTool(c, bp))); used.push(...calls.map(c => ({ name: c.name, args: c.args })));
      extra += `\n\nTOOL RESULTS (round ${round + 1}):\n${calls.map((c, i) => `${c.name} ${JSON.stringify(c.args ?? {})} =>\n${out[i]}`).join('\n\n')}\n\nNow ${round === 1 ? 'you MUST give the final answer JSON (no tool_calls)' : 'answer, or call more tools if truly needed'}.`;
      ({ content, model } = await ask(extra));
    }
    const r = parseJson<{ reply?: string; tool_calls?: unknown }>(content); if (!r.reply) r.reply = 'I gathered the data but could not summarise it. Please ask again.'; delete r.tool_calls;
    return NextResponse.json({ ...r, tools: used, model });
  } catch (e) { await refund(actor, 'chat'); const err = e instanceof AiError ? e : new AiError(String(e)); return fail(err.status, err.message, err.status === 503 ? ['AI_API_KEY'] : undefined); }
}
