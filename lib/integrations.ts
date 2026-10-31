import 'server-only';
import { cookies } from 'next/headers';
import { unseal } from '@/lib/seal';
import { envValue } from '@/lib/env';

export type GithubSession = { token: string; login: string };
export type VercelSession = { token: string; teamId?: string | null; source: 'oauth' | 'env' };

export async function githubSession() { return unseal<GithubSession>((await cookies()).get('kx_gh')?.value); }
export async function vercelSession(): Promise<VercelSession | null> {
  let s: VercelSession | null = null;
  try { s = unseal<VercelSession>((await cookies()).get('kx_vc')?.value); } catch { s = null; }
  if (s) return s;
  const t = envValue('VERCEL_TOKEN');
  return t ? { token: t, teamId: envValue('VERCEL_TEAM_ID') || null, source: 'env' } : null;
}
export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'ikarvo-app';
