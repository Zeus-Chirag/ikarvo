import { NextResponse } from 'next/server';
import { requireActor } from '@/lib/auth';
import { normalizeUrl, safeFetch } from '@/lib/site';
import { fail, readJson, str } from '@/lib/http';
export const runtime = 'nodejs';
/** Fetch a SKILL.md-style skill from a URL (GitHub blob/raw, gist, any public page). Installed skills are added to the AI CMO context. */
export async function POST(req: Request) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  const b = await readJson(req); let u: URL; try { u = normalizeUrl(str(b?.url, 500)); } catch { return fail(400, 'Enter a valid URL.'); }
  if (u.hostname === 'github.com' && u.pathname.includes('/blob/')) u = new URL(`https://raw.githubusercontent.com${u.pathname.replace('/blob/', '/')}`);
  try {
    const { res, url } = await safeFetch(u, 10000); if (!res.ok) return fail(502, `Could not fetch the skill (${res.status}).`);
    let text = (await res.text()).slice(0, 200_000); const html = /<html|<!doctype/i.test(text.slice(0, 500));
    if (html) text = text.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const fm = text.match(/^---\s*([\s\S]*?)\s*---/); const get = (k: string) => fm?.[1].match(new RegExp(`^${k}:\\s*(.+)$`, 'm'))?.[1].trim().replace(/^["']|["']$/g, '');
    const name = get('name') || text.match(/^#\s+(.+)$/m)?.[1] || url.pathname.split('/').filter(Boolean).slice(-2).join('/');
    return NextResponse.json({ name: name.slice(0, 100), description: (get('description') || '').slice(0, 300), body: text.slice(0, 20000), url: url.toString(), format: html ? 'page-text' : fm ? 'skill.md' : 'text' });
  } catch (e) { return fail(502, e instanceof Error ? e.message : String(e)); }
}
