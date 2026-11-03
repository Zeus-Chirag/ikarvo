import 'server-only';
import { cookies } from 'next/headers';
import { unseal } from '@/lib/seal';
import { envValue } from '@/lib/env';
import { connValue } from '@/lib/conn';

export type GithubSession = { token: string; login: string };
export type VercelSession = { token: string; teamId?: string | null; source: 'oauth' | 'env' };

export async function githubSession() { return unseal<GithubSession>(await connValue('kx_gh')); }
export async function vercelSession(): Promise<VercelSession | null> {
  let s: VercelSession | null = null;
  try { s = unseal<VercelSession>(await connValue('kx_vc')); } catch { s = null; }
  if (s) return s;
  const t = process.env.PREVIEW_MODE === '1' ? envValue('VERCEL_TOKEN') : '';
  return t ? { token: t, teamId: envValue('VERCEL_TEAM_ID') || null, source: 'env' } : null;
}
export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'ikarvo-app';
