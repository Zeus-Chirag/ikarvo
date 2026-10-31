import 'server-only';
import type { Actor } from '@/lib/auth';

/** Private bucket for large uploads that go browser → Supabase Storage directly (skipping Vercel's 4.5 MB body cap). */
export const UPLOAD_BUCKET = 'media-uploads';
export const UPLOAD_MAX_BYTES = 50 * 1024 * 1024; // matches the bucket's file_size_limit (Supabase free-plan ceiling)

export function stagedPath(actor: Actor, name: string) {
  const safe = name.replace(/[^\w.\-]+/g, '-').slice(-80) || 'upload.bin';
  return `${actor.id}/${crypto.randomUUID()}-${safe}`;
}

/** Load a staged object the actor owns, as a File. Deletes it afterwards when `consume` is set. */
export async function takeStaged(actor: Actor, path: string, consume = true): Promise<File> {
  if (!actor.supabase) throw new Error('Staged uploads need Supabase (not available in preview mode).');
  if (!path.startsWith(`${actor.id}/`) || path.includes('..')) throw new Error('That upload does not belong to you.');
  const { data, error } = await actor.supabase.storage.from(UPLOAD_BUCKET).download(path);
  if (error || !data) throw new Error(`Could not read the staged upload: ${error?.message ?? 'missing'}`);
  const name = path.split('/').pop()!.replace(/^[0-9a-f-]{36}-/, '');
  const file = new File([data], name, { type: data.type || 'application/octet-stream' });
  if (consume) await actor.supabase.storage.from(UPLOAD_BUCKET).remove([path]);
  return file;
}

/** Read either multipart (small files / preview) or JSON { storagePath, ...fields } (large files via Storage). */
export async function readUpload(req: Request, actor: Actor): Promise<{ file: File | null; get: (k: string) => string | null; error?: string }> {
  const ct = req.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    const b = await req.json().catch(() => null) as Record<string, unknown> | null; if (!b) return { file: null, get: () => null, error: 'Invalid JSON.' };
    try { const file = await takeStaged(actor, String(b.storagePath ?? '')); const typed = b.type ? new File([file], file.name, { type: String(b.type) }) : file; return { file: typed, get: k => b[k] == null ? null : String(b[k]) }; }
    catch (e) { return { file: null, get: () => null, error: e instanceof Error ? e.message : String(e) }; }
  }
  try { const f = await req.formData(); const file = f.get('file'); return { file: file instanceof File ? file : null, get: k => { const v = f.get(k); return typeof v === 'string' ? v : null; } }; }
  catch { return { file: null, get: () => null, error: 'Send multipart/form-data with a file, or JSON with storagePath.' }; }
}
