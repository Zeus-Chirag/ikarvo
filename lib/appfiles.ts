/** Multi-file static apps produced by the builder. Shared by the client (preview, zip) and the server (validation, push, deploy). */
export type AppFile = { path: string; content: string };
export const MAX_FILES = 24; export const MAX_TOTAL = 1_500_000;
const SAFE = /^(?!\/)(?!.*\.\.)[a-zA-Z0-9_\-./]{1,120}$/;
const OK_EXT = /\.(html|css|js|mjs|cjs|jsx|ts|tsx|json|svg|txt|md|webmanifest)$/i;

export function cleanFiles(input: unknown): AppFile[] {
  if (!Array.isArray(input)) throw new Error('files must be an array.');
  const out: AppFile[] = []; let total = 0; const seen = new Set<string>();
  for (const f of input.slice(0, MAX_FILES)) {
    const path = String((f as AppFile)?.path ?? '').replace(/^\.?\//, '').trim(); const content = String((f as AppFile)?.content ?? '');
    if (!SAFE.test(path) || !OK_EXT.test(path)) throw new Error(`Unsupported file path: ${path || '(empty)'}`);
    if (seen.has(path)) continue; seen.add(path); total += content.length; if (total > MAX_TOTAL) throw new Error('App is larger than 1.5 MB of source.');
    out.push({ path, content });
  }
  if (!out.some(f => f.path === 'index.html' || f.path === 'package.json')) throw new Error('The project has no index.html or package.json.');
  return out;
}

const resolve = (from: string, ref: string) => { const base = from.split('/').slice(0, -1); for (const part of ref.replace(/^\.\//, '').split('/')) { if (part === '..') base.pop(); else if (part && part !== '.') base.push(part); } return base.join('/'); };
const isLocal = (u: string) => !!u && !/^(?:[a-z]+:|\/\/|#|data:)/i.test(u);

/** Build a self-contained document for one page: local CSS/JS are inlined and links between pages are routed via postMessage. */
export function previewDoc(files: AppFile[], page = 'index.html') {
  const map = new Map(files.map(f => [f.path, f.content])); let html = map.get(page) ?? map.get('index.html') ?? '';
  html = html.replace(/<link\b[^>]*href=["']([^"']+\.css)["'][^>]*>/gi, (m, href) => { const c = isLocal(href) ? map.get(resolve(page, href)) : undefined; return c == null ? m : `<style data-file="${resolve(page, href)}">\n${c.replace(/<\/style/gi, '<\\/style')}\n</style>`; });
  html = html.replace(/<script\b([^>]*)\bsrc=["']([^"']+\.m?js)["']([^>]*)><\/script>/gi, (m, a, src, b) => { const c = isLocal(src) ? map.get(resolve(page, src)) : undefined; return c == null ? m : `<script${a}${b} data-file="${resolve(page, src)}">\n${c.replace(/<\/script/gi, '<\\/script')}\n</script>`; });
  const router = `<script>document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');if(!a)return;var h=a.getAttribute('href');if(/^(?:[a-z]+:|\\/\\/|#)/i.test(h))return;var p=h.split('#')[0].split('?')[0];if(!/\\.html$/i.test(p))return;e.preventDefault();parent.postMessage({ikarvoPage:p,from:${JSON.stringify(page)}},'*')},true)</script>`;
  return withShim(/<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${router}</body>`) : html + router);
}
export const resolvePath = resolve;

/** Sandboxed previews have no origin, so Web Storage throws. Swap in an in-memory Storage so generated apps still run. */
const SHIM = `<script>(function(){function M(){var d={};return{getItem:function(k){return k in d?d[k]:null},setItem:function(k,v){d[k]=String(v)},removeItem:function(k){delete d[k]},clear:function(){d={}},key:function(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}}['localStorage','sessionStorage'].forEach(function(n){try{window[n].getItem('x')}catch(e){try{Object.defineProperty(window,n,{value:M(),configurable:true})}catch(_){}}})})()</script>`;
export function withShim(html: string) { return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, m => m + SHIM) : SHIM + html; }

/** Minimal ZIP (store, no compression) so users can download the whole project. */
export function zip(files: AppFile[]): Blob {
  const enc = new TextEncoder(); const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b: Uint8Array) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const parts: Uint8Array[] = []; const central: Uint8Array[] = []; let off = 0;
  for (const f of files) {
    const name = enc.encode(f.path); const data = enc.encode(f.content); const c = crc(data);
    const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint32(14, c, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true);
    parts.push(new Uint8Array(h.buffer), name, data);
    const d = new DataView(new ArrayBuffer(46)); d.setUint32(0, 0x02014b50, true); d.setUint16(4, 20, true); d.setUint16(6, 20, true); d.setUint16(8, 0x0800, true); d.setUint32(16, c, true); d.setUint32(20, data.length, true); d.setUint32(24, data.length, true); d.setUint16(28, name.length, true); d.setUint32(42, off, true);
    central.push(new Uint8Array(d.buffer), name); off += 30 + name.length + data.length;
  }
  const size = central.reduce((n, p) => n + p.length, 0); const e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, size, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...central, new Uint8Array(e.buffer)] as BlobPart[], { type: 'application/zip' });
}

/** Project types the builder can produce. */
export type Kind = 'web' | 'mobile' | 'site';
export const KINDS: Kind[] = ['web', 'mobile', 'site'];

/** Expo preview: App.js is compiled in the browser with Babel and rendered through react-native-web (esm.sh), inside a sandboxed iframe. */
export function mobileDoc(files: AppFile[]) {
  const app = files.find(f => /^(src\/)?App\.(js|jsx|tsx|ts)$/.test(f.path)) ?? files.find(f => /\.(jsx|tsx)$/.test(f.path));
  const src = JSON.stringify(app?.content ?? 'export default function App(){return null}').replace(/</g, '\\u003c');
  const rn = 'https://esm.sh/react-native-web@0.19.13?deps=react@18.3.1,react-dom@18.3.1';
  const stub = 'data:text/javascript,' + encodeURIComponent("export const StatusBar=()=>null;export default {};");
  return withShim(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body,#root{height:100%;margin:0}#root{display:flex}#err{font:13px/1.5 ui-monospace,monospace;color:#b42318;padding:16px;white-space:pre-wrap}</style>
<script type="importmap">{"imports":{"react":"https://esm.sh/react@18.3.1","react/jsx-runtime":"https://esm.sh/react@18.3.1/jsx-runtime","react-dom":"https://esm.sh/react-dom@18.3.1","react-native":"${rn}","expo-status-bar":"${stub}","expo-constants":"${stub}"}}</script>
<script src="https://unpkg.com/@babel/standalone@7.26.4/babel.min.js"></script></head><body><div id="root"></div>
<script type="module">
const show=e=>{document.body.innerHTML='<div id="err"></div>';document.getElementById('err').textContent='Preview error: '+(e&&e.message||e)};
try{const code=Babel.transform(${src},{filename:'App.tsx',presets:[['react',{runtime:'automatic'}],'typescript']}).code;
const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));
const [m,rn]=await Promise.all([import(url),import('react-native')]);
rn.AppRegistry.registerComponent('App',()=>m.default);rn.AppRegistry.runApplication('App',{rootTag:document.getElementById('root')});}catch(e){show(e)}
window.addEventListener('error',e=>show(e.error||e.message));
</script></body></html>`);
}
