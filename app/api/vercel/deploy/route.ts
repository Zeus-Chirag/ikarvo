import { NextResponse } from 'next/server';
import { requireActor } from '@/lib/auth';
import { vercelSession, slugify } from '@/lib/integrations';
import { featureStatus } from '@/lib/env';
import { fail, readJson, str } from '@/lib/http';
import { cleanFiles, type AppFile } from '@/lib/appfiles';
export const runtime = 'nodejs';

export async function GET() {
  const f = featureStatus().vercel; const s = f.ok ? await vercelSession().catch(() => null) : null;
  return NextResponse.json({ configured: f.ok, connected: !!s, source: s?.source ?? null });
}

export async function POST(req: Request) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  const f = featureStatus().vercel; if (!f.ok) return fail(503, `Vercel is not configured. Add ${f.missing.join(', ')} (or VERCEL_TOKEN for single-owner mode).`, f.missing);
  const s = await vercelSession(); if (!s) return fail(401, 'Connect your Vercel account first.');
  const b = await readJson(req); if (!b) return fail(400, 'Request body must be JSON.');
  let files: AppFile[];
  try { files = b.files ? cleanFiles(b.files) : [{ path: 'index.html', content: str(b.html, 2_000_000) }]; } catch (e) { return fail(400, e instanceof Error ? e.message : String(e)); }
  if (!files[0]?.content) return fail(400, 'Nothing to deploy yet. Generate an app first.');
  const q = s.teamId ? `?teamId=${encodeURIComponent(s.teamId)}` : '';
  const r = await fetch(`https://api.vercel.com/v13/deployments${q}`, { method: 'POST', headers: { Authorization: `Bearer ${s.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: slugify(str(b.name, 90)), files: files.map(f => ({ file: f.path, data: f.content })), projectSettings: { framework: null }, target: b.production ? 'production' : undefined }) });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 || r.status === 403 && d?.error?.code === 'forbidden' && s.source === 'oauth') { const x = fail(401, 'Vercel rejected the token (revoked or integration removed). Reconnect Vercel.'); if (s.source === 'oauth') x.cookies.delete('kx_vc'); return x; }
  if (!r.ok) return fail(r.status, `Vercel error: ${d?.error?.message ?? r.status}`);
  return NextResponse.json({ url: `https://${d.url}`, id: d.id, state: d.readyState ?? d.status });
}
