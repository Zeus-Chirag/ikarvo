import { ApiError } from './api';
export const TEXT_EXT = /\.(md|markdown|txt|csv|json)$/i;
export const DOC_EXT = /\.(pdf|docx)$/i;
export const ACCEPT = '.md,.markdown,.txt,.csv,.json,.pdf,.docx';
/** Read a context file as text: plain-text formats locally, PDF/DOCX via /api/extract. */
export async function readText(f: File): Promise<string> {
  if (TEXT_EXT.test(f.name)) { if (f.size > 500_000) throw new Error(`${f.name} is over 500 KB`); return (await f.text()).slice(0, 50000); }
  if (!DOC_EXT.test(f.name)) throw new Error(`${f.name}: unsupported type`);
  const fd = new FormData(); fd.append('file', f); const r = await fetch('/api/extract', { method: 'POST', body: fd }); const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(d.error || `Could not read ${f.name} (${r.status})`, d.setup, r.status);
  return d.text as string;
}
