/** Small, safe Markdown → HTML converter for publishing article drafts (headings, lists, tables, emphasis, links, code). */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s: string) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>')
  .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
export function mdToHtml(md: string) {
  const out: string[] = []; const lines = md.replace(/\r/g, '').split('\n'); let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (/^```/.test(l)) { const buf = []; i++; while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]); i++; out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`); continue; }
    const h = /^(#{1,6})\s+(.*)/.exec(l); if (h) { out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i++; continue; }
    if (/^\s*\|/.test(l)) { const rows = []; while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(lines[i++]); const cells = (r: string) => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const body = rows.filter((r, j) => !(j === 1 && /^[\s|:-]+$/.test(r))); out.push(`<table><thead><tr>${cells(body[0]).map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body.slice(1).map(r => `<tr>${cells(r).map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`); continue; }
    if (/^\s*([-*]|\d+\.)\s+/.test(l)) { const ordered = /^\s*\d+\./.test(l); const items = []; while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, ''));
      out.push(`<${ordered ? 'ol' : 'ul'}>${items.map(x => `<li>${inline(x)}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>`); continue; }
    if (/^>\s?/.test(l)) { out.push(`<blockquote>${inline(l.replace(/^>\s?/, ''))}</blockquote>`); i++; continue; }
    if (!l.trim()) { i++; continue; }
    const para = []; while (i < lines.length && lines[i].trim() && !/^(#|```|\s*\||\s*([-*]|\d+\.)\s|>)/.test(lines[i])) para.push(lines[i++]);
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  return out.join('\n');
}
