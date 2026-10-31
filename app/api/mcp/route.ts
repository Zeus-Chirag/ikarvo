import { NextResponse } from 'next/server';
import { requireActor } from '@/lib/auth';
import { normalizeUrl, safeFetch } from '@/lib/site';
import { fail, readJson, str } from '@/lib/http';
export const runtime = 'nodejs';
/** Connect test for a remote MCP server (Streamable HTTP): initialize, then tools/list. Tokens are used for this request only, never stored server-side. */
export async function POST(req: Request) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  const b = await readJson(req); let u: URL; try { u = normalizeUrl(str(b?.url, 500)); } catch { return fail(400, 'Enter the MCP server URL.'); }
  const token = str(b?.token, 2000);
  const h: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const parse = async (r: Response) => { const t = await r.text(); if ((r.headers.get('content-type') ?? '').includes('event-stream')) { const line = t.split('\n').filter(l => l.startsWith('data:')).pop(); return line ? JSON.parse(line.slice(5)) : {}; } return t ? JSON.parse(t) : {}; };
  try {
    const init = await safeFetch(u, 15000, 0, { method: 'POST', headers: h, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'ikarvo', version: '1.0' } } }) });
    if (init.res.status === 401) return fail(401, 'The MCP server requires authorization. Add a bearer token.');
    if (!init.res.ok) return fail(502, `initialize failed (${init.res.status}).`);
    const info = await parse(init.res); const sid = init.res.headers.get('mcp-session-id'); if (sid) h['Mcp-Session-Id'] = sid;
    await safeFetch(u, 8000, 0, { method: 'POST', headers: h, body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) }).catch(() => null);
    const tl = await safeFetch(u, 15000, 0, { method: 'POST', headers: h, body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }) });
    const tools = tl.res.ok ? await parse(tl.res) : {};
    return NextResponse.json({ server: info.result?.serverInfo ?? null, protocol: info.result?.protocolVersion ?? null, tools: (tools.result?.tools ?? []).map((t: { name: string; description?: string }) => ({ name: t.name, description: (t.description ?? '').slice(0, 200) })) });
  } catch (e) { return fail(502, e instanceof Error ? e.message : String(e)); }
}
