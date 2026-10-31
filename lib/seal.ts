import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { envValue } from '@/lib/env';

function key() {
  const s = envValue('SESSION_SECRET');
  if (s.length < 16) throw new Error('SESSION_SECRET must be set (at least 32 random characters).');
  return createHash('sha256').update(s).digest();
}
/** AES-256-GCM seal for tokens stored in httpOnly cookies. */
export function seal(value: unknown) {
  const iv = randomBytes(12); const c = createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(JSON.stringify(value), 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64url');
}
export function unseal<T>(token: string | undefined): T | null {
  if (!token) return null;
  try {
    const raw = Buffer.from(token, 'base64url'); const d = createDecipheriv('aes-256-gcm', key(), raw.subarray(0, 12));
    d.setAuthTag(raw.subarray(12, 28));
    return JSON.parse(Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString('utf8')) as T;
  } catch { return null; }
}
export const cookieOpts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: 60 * 60 * 24 * 30 };
