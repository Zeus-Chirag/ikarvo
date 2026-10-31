import { NextResponse } from 'next/server';
import { requireActor } from '@/lib/auth';
import { githubSession, slugify } from '@/lib/integrations';
import { fail, readJson, str } from '@/lib/http';
import { featureStatus } from '@/lib/env';
import { cleanFiles, type AppFile } from '@/lib/appfiles';
export const runtime = 'nodejs';

async function gh(token: string, path: string, init?: RequestInit) {
  const r = await fetch(`https://api.github.com${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'ikarvo', ...(init?.headers ?? {}) }, cache: 'no-store' });
  return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) };
}

export async function GET() {
  const f = featureStatus().github; const s = f.ok ? await githubSession().catch(() => null) : null;
  return NextResponse.json({ configured: f.ok, connected: !!s, login: s?.login ?? null });
}

export async function POST(req: Request) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  if (!featureStatus().github.ok) return fail(503, 'GitHub is not configured. Add GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET and SESSION_SECRET.', featureStatus().github.missing);
  const s = await githubSession(); if (!s) return fail(401, 'Connect your GitHub account first.');
  const b = await readJson(req); if (!b) return fail(400, 'Request body must be JSON.');
  let files: AppFile[];
  try { files = b.files ? cleanFiles(b.files) : [{ path: 'index.html', content: str(b.html, 2_000_000) }]; } catch (e) { return fail(400, e instanceof Error ? e.message : String(e)); }
  if (!files[0]?.content) return fail(400, 'Nothing to push yet. Generate an app first.');
  const repo = slugify(str(b.repo, 100));
  let r = await gh(s.token, `/repos/${s.login}/${repo}`);
  if (r.status === 401) { const x = fail(401, 'GitHub revoked this token. Reconnect GitHub in Integrations.'); x.cookies.delete('kx_gh'); return x; }
  if (r.status === 404) {
    r = await gh(s.token, '/user/repos', { method: 'POST', body: JSON.stringify({ name: repo, private: b.private !== false, auto_init: true, description: 'Built with Ikarvo' }) });
    if (!r.ok) return fail(r.status, `GitHub refused to create the repo: ${r.data?.message ?? r.status}`);
  } else if (!r.ok) return fail(r.status, `GitHub error: ${r.data?.message ?? r.status}`);
  const branch = r.data.default_branch || 'main';
  // One commit for the whole file set via the Git Data API (base tree keeps files the app doesn't manage, like README).
  const base = `/repos/${s.login}/${repo}`; const msg = str(b.message, 200) || 'Update from Ikarvo';
  let ref = await gh(s.token, `${base}/git/ref/heads/${branch}`);
  for (let i = 0; i < 4 && ref.status === 404; i++) { await new Promise(r => setTimeout(r, 800)); ref = await gh(s.token, `${base}/git/ref/heads/${branch}`); } // fresh auto_init repos take a moment
  if (!ref.ok) return fail(ref.status, `Could not read ${branch}: ${ref.data?.message ?? ref.status}`);
  const parent = ref.data.object.sha as string; const pc = await gh(s.token, `${base}/git/commits/${parent}`);
  const tree = await gh(s.token, `${base}/git/trees`, { method: 'POST', body: JSON.stringify({ base_tree: pc.data?.tree?.sha, tree: files.map(f => ({ path: f.path, mode: '100644', type: 'blob', content: f.content })) }) });
  if (!tree.ok) return fail(tree.status, `Push failed (tree): ${tree.data?.message ?? tree.status}`);
  const commit = await gh(s.token, `${base}/git/commits`, { method: 'POST', body: JSON.stringify({ message: msg, tree: tree.data.sha, parents: [parent] }) });
  if (!commit.ok) return fail(commit.status, `Push failed (commit): ${commit.data?.message ?? commit.status}`);
  const upd = await gh(s.token, `${base}/git/refs/heads/${branch}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.data.sha }) });
  if (!upd.ok) return fail(upd.status, `Push failed (ref): ${upd.data?.message ?? upd.status}`);
  const put = { data: { commit: { html_url: commit.data.html_url as string } } };
  return NextResponse.json({ repoUrl: `https://github.com/${s.login}/${repo}`, commitUrl: put.data?.commit?.html_url });
}
