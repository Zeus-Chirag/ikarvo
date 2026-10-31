'use client';
import { useCallback, useRef, useState } from 'react';
import { uid, type Asset, type Assets } from './engine';

/** Tiny IndexedDB blob store so uploaded media and renders survive reloads (they never leave the browser unless you publish). */
const DB = 'ikarvo-ad'; const STORE = 'blobs';
function db(): Promise<IDBDatabase> { return new Promise((res, rej) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(STORE); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
export async function idbPut(key: string, v: unknown) { const d = await db(); await new Promise((res, rej) => { const tx = d.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(v, key); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); }
export async function idbGet<T>(key: string): Promise<T | undefined> { const d = await db(); return new Promise((res, rej) => { const r = d.transaction(STORE).objectStore(STORE).get(key); r.onsuccess = () => res(r.result as T); r.onerror = () => rej(r.error); }); }
export async function idbDel(key: string) { const d = await db(); await new Promise(res => { const tx = d.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(key); tx.oncomplete = res; }); }
export async function idbKeys(prefix: string): Promise<string[]> { const d = await db(); return new Promise(res => { const r = d.transaction(STORE).objectStore(STORE).getAllKeys(); r.onsuccess = () => res((r.result as string[]).filter(k => String(k).startsWith(prefix))); }); }

let actx: AudioContext | null = null; export const audioCtx = () => (actx ??= new AudioContext());
const kindOf = (type: string): Asset['kind'] | null => type.startsWith('image/') ? 'image' : type.startsWith('video/') ? 'video' : type.startsWith('audio/') ? 'audio' : null;

async function materialize(id: string, blob: Blob, name: string): Promise<Asset> {
  const kind = kindOf(blob.type); if (!kind) throw new Error(`Unsupported file type ${blob.type || 'unknown'}.`);
  const url = URL.createObjectURL(blob); const a: Asset = { id, kind, name, url };
  if (kind === 'image') { const img = new Image(); img.src = url; await img.decode(); a.el = img; }
  if (kind === 'video') { const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url; await new Promise<void>((res, rej) => { v.onloadeddata = () => res(); v.onerror = () => rej(new Error('Could not decode this video in the browser.')); }); a.el = v; a.duration = v.duration; }
  if (kind === 'audio' || kind === 'video') { try { a.buffer = await audioCtx().decodeAudioData(await blob.arrayBuffer()); a.duration ??= a.buffer.duration; } catch { if (kind === 'audio') throw new Error('Could not decode this audio file.'); } }
  return a;
}

export function useAssets() {
  const [, setRev] = useState(0); const ref = useRef<Assets>(new Map());
  const put = useCallback((a: Asset) => { ref.current.set(a.id, a); setRev(r => r + 1); return a; }, []);
  const addBlob = useCallback(async (blob: Blob, name: string, id = uid()) => { const a = await materialize(id, blob, name); await idbPut(`asset:${id}`, { blob, name }).catch(() => {}); return put(a); }, [put]);
  /** Remote media goes through our same-origin proxy so the canvas stays exportable. data: URLs are used directly. */
  const addUrl = useCallback(async (url: string, name: string) => {
    const r = await fetch(url.startsWith('data:') || url.startsWith('blob:') ? url : `/api/ad/proxy?url=${encodeURIComponent(url)}`);
    if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error ?? `Could not fetch media (${r.status}).`); }
    return addBlob(await r.blob(), name);
  }, [addBlob]);
  const restore = useCallback(async (ids: string[]) => { for (const id of ids) { if (ref.current.has(id)) continue; const v = await idbGet<{ blob: Blob; name: string }>(`asset:${id}`).catch(() => undefined); if (v) put(await materialize(id, v.blob, v.name).catch(() => ({ id, kind: 'image', name: `${v.name} (failed to load)`, url: '' } as Asset))); } }, [put]);
  const remove = useCallback((id: string) => { ref.current.delete(id); idbDel(`asset:${id}`).catch(() => {}); setRev(r => r + 1); }, []);
  return { assets: ref.current, addBlob, addUrl, restore, remove };
}
export type AssetApi = ReturnType<typeof useAssets>;
