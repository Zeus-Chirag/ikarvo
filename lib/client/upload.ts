import { createClient } from '@/lib/supabase/client';
import { ApiError } from './api';

const DIRECT_LIMIT = 4 * 1024 * 1024; // below Vercel's 4.5 MB request cap, with room for multipart overhead

/**
 * POST a file plus fields to an API route. Small files (and preview mode) go as multipart; larger files are uploaded
 * straight from the browser to Supabase Storage with a signed URL, and only the storage path is sent to the route.
 */
export async function postFile<T>(url: string, file: File, fields: Record<string, string>, opts: { cloud: boolean; onStage?: (s: string) => void }): Promise<T> {
  let res: Response;
  if (!opts.cloud || file.size <= DIRECT_LIMIT) {
    const fd = new FormData(); fd.append('file', file); for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    res = await fetch(url, { method: 'POST', body: fd });
  } else {
    opts.onStage?.('Uploading to storage…');
    const r = await fetch('/api/media/upload-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: file.name, size: file.size, type: file.type }) });
    const s = await r.json().catch(() => ({})); if (!r.ok) throw new ApiError(s.error || `Could not start the upload (${r.status}).`, s.setup, r.status);
    const { error } = await createClient().storage.from(s.bucket).uploadToSignedUrl(s.path, s.token, file, { contentType: file.type });
    if (error) throw new ApiError(`Storage upload failed: ${error.message}`);
    opts.onStage?.('Handing off…');
    res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...fields, storagePath: s.path, type: file.type }) });
  }
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(d.error || (res.status === 413 ? 'File too large for this server.' : `Upload failed (${res.status}).`), d.setup, res.status);
  return d as T;
}
