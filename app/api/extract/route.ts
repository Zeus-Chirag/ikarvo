import { NextResponse } from 'next/server';
import { requireActor } from '@/lib/auth';
import { fail } from '@/lib/http';
export const runtime = 'nodejs'; export const maxDuration = 60;
const MAX = 4 * 1024 * 1024; // stays under Vercel's 4.5 MB request cap
/** Extract plain text from an uploaded PDF or DOCX (multipart "file"). Scanned PDFs without a text layer return an error, not OCR. */
export async function POST(req: Request) {
  const actor = await requireActor(); if (actor instanceof NextResponse) return actor;
  let form: FormData; try { form = await req.formData(); } catch { return fail(400, 'Send multipart/form-data with the document as "file".'); }
  const file = form.get('file'); if (!(file instanceof File) || !file.size) return fail(400, 'Attach a PDF or DOCX.');
  if (file.size > MAX) return fail(413, `${file.name} is ${(file.size / 1048576).toFixed(1)} MB; documents up to 4 MB are supported.`);
  const buf = new Uint8Array(await file.arrayBuffer()); const n = file.name.toLowerCase();
  try {
    let text = ''; let pages: number | undefined;
    if (n.endsWith('.pdf') || file.type === 'application/pdf') {
      const { extractText, getDocumentProxy } = await import('unpdf');
      const pdf = await getDocumentProxy(buf); const r = await extractText(pdf, { mergePages: false }); pages = r.totalPages;
      text = (r.text as string[]).map((t, i) => `--- Page ${i + 1} ---\n${t.trim()}`).join('\n\n');
      if (!(r.text as string[]).join('').trim()) return fail(422, `${file.name} has no text layer (likely scanned). Export it with text or paste the content.`);
    } else if (n.endsWith('.docx')) {
      const mammoth = await import('mammoth'); const r = await mammoth.extractRawText({ buffer: Buffer.from(buf) }); text = r.value;
    } else return fail(415, 'Only .pdf and .docx are extracted here; .doc (Word 97) is not supported.');
    text = text.replace(/\n{3,}/g, '\n\n').trim();
    return NextResponse.json({ name: file.name, text: text.slice(0, 50000), chars: text.length, truncated: text.length > 50000, pages });
  } catch (e) { return fail(422, `Could not read ${file.name}: ${e instanceof Error ? e.message : String(e)}`); }
}
