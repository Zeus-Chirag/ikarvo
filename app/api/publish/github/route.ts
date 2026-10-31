import { NextResponse } from 'next/server';
import { requireActor } from '@/lib/auth';
import { githubSession, slugify } from '@/lib/integrations';
import { featureStatus } from '@/lib/env';
import { fail, readJson, str } from '@/lib/http';
export const runtime = 'nodejs';
// Commits a Markdown article into an existing repo (e.g. a Next/Astro/Hugo blog's content folder).
export async function POST(req: Request) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  const f = featureStatus().github; if (!f.ok) return fail(503, `GitHub is not configured. Add ${f.missing.join(', ')}.`, f.missing);
  const s = await githubSession(); if (!s) return fail(401, 'Connect your GitHub account first (Integrations).');
  const b = await readJson(req); const repo = str(b?.repo, 140); const content = str(b?.content, 500000);
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return fail(400, 'Repository must look like owner/name.');
  const dir = str(b?.dir, 120).replace(/^\/+|\/+$/g, '') || 'content/blog'; if (dir.includes('..')) return fail(400, 'Invalid folder.');
  const path = `${dir}/${slugify(str(b?.slug, 100) || 'post')}.md`;
  const h = { Authorization: `Bearer ${s.token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'ikarvo' };
  const existing = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, { headers: h, cache: 'no-store' }).then(r => r.ok ? r.json() : null);
  const r = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, { method: 'PUT', headers: h, body: JSON.stringify({ message: `Add article: ${path}`, content: Buffer.from(content).toString('base64'), ...(existing?.sha ? { sha: existing.sha } : {}) }) });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401) { const x = fail(401, 'GitHub revoked this token. Reconnect GitHub in Integrations.'); x.cookies.delete('kx_gh'); return x; }
  if (!r.ok) return fail(r.status, `GitHub error: ${d?.message ?? r.status}`);
  return NextResponse.json({ url: d.content?.html_url, path });
}
