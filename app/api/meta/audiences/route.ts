import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { readJson, str, fail } from '@/lib/http';
import { graph, isCtx, logEvent, metaCtx, metaFail } from '@/lib/meta';
export const runtime = 'nodejs'; export const maxDuration = 120;
type Aud = { id: string; name: string; subtype: string; approximate_count_lower_bound?: number; approximate_count_upper_bound?: number; operation_status?: { code: number; description: string }; lookalike_spec?: { ratio?: number; country?: string } };
/** Custom + lookalike audiences on the selected ad account. */
export async function GET() {
  const ctx = await metaCtx(); if (!isCtx(ctx)) return ctx;
  try { const d = await graph<{ data: Aud[] }>(ctx.conn.token, `${ctx.act}/customaudiences`, { params: { fields: 'id,name,subtype,approximate_count_lower_bound,approximate_count_upper_bound,operation_status,lookalike_spec', limit: 100 } });
    return NextResponse.json({ audiences: d.data }); } catch (e) { return metaFail(e); }
}
/**
 * kind=lookalike: {originId, country, ratio 0.01-0.2}. kind=customer_list: {name, emails[]} → SHA-256 normalised emails uploaded to /{id}/users.
 * Customer lists require the ad account to have accepted Meta's Custom Audience terms; Meta's error is returned as-is if not.
 */
export async function POST(req: Request) {
  const ctx = await metaCtx(); if (!isCtx(ctx)) return ctx;
  const b = await readJson<{ kind?: string; originId?: string; country?: string; ratio?: number; name?: string; emails?: string[] }>(req);
  try {
    if (b?.kind === 'lookalike') {
      const origin = str(b.originId, 40); const country = str(b.country, 2).toUpperCase(); const ratio = Math.max(0.01, Math.min(0.2, Number(b.ratio) || 0.01));
      if (!/^\d+$/.test(origin) || !/^[A-Z]{2}$/.test(country)) return fail(400, 'Pick a seed audience and a 2-letter country code.');
      const d = await graph<{ id: string }>(ctx.conn.token, `${ctx.act}/customaudiences`, { method: 'POST', params: { name: str(b.name, 120) || `Ikarvo lookalike ${Math.round(ratio * 100)}% ${country}`, subtype: 'LOOKALIKE', origin_audience_id: origin, lookalike_spec: { type: 'similarity', ratio, country } } });
      await logEvent(ctx, 'audience', d.id, 'created', { subtype: 'LOOKALIKE', origin, country, ratio });
      return NextResponse.json({ id: d.id, note: 'Meta takes from 1 to 6 hours to populate a lookalike.' });
    }
    if (b?.kind === 'customer_list') {
      const emails = [...new Set((b.emails ?? []).map(e => String(e).trim().toLowerCase()).filter(e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)))].slice(0, 10000);
      if (emails.length < 1) return fail(400, 'Add at least one valid email. Meta needs about 100 matched people before a list can seed a lookalike.');
      const a = await graph<{ id: string }>(ctx.conn.token, `${ctx.act}/customaudiences`, { method: 'POST', params: { name: str(b.name, 120) || 'Ikarvo customer list', subtype: 'CUSTOM', customer_file_source: 'USER_PROVIDED_ONLY', description: 'Uploaded from Ikarvo (SHA-256 hashed emails)' } });
      const data = emails.map(e => [createHash('sha256').update(e).digest('hex')]);
      const u = await graph<{ num_received?: number; num_invalid_entries?: number }>(ctx.conn.token, `${a.id}/users`, { method: 'POST', params: { payload: { schema: ['EMAIL_SHA256'], data } } });
      await logEvent(ctx, 'audience', a.id, 'created', { subtype: 'CUSTOM', received: u.num_received });
      return NextResponse.json({ id: a.id, received: u.num_received ?? emails.length, invalid: u.num_invalid_entries ?? 0 });
    }
    return fail(400, 'kind must be lookalike or customer_list.');
  } catch (e) { return metaFail(e); }
}
