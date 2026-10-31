import { createClient } from '@/lib/supabase/client';
import { uid } from './api';

export type Table = 'projects' | 'campaigns' | 'posts' | 'listings' | 'brands' | 'articles' | 'visibility' | 'threads' | 'crawls' | 'influencers' | 'backlinks' | 'competitors' | 'reports' | 'settings' | 'chats' | 'memories' | 'skills' | 'mcp' | 'team' | 'docs' | 'ugc' | 'hn' | 'logs' | 'sequences' | 'launches' | 'ads' | 'ad_projects';
export type Doc<T> = { id: string; title: string; data: T; created_at: string; updated_at: string };
export interface Store {
  mode: 'local' | 'cloud';
  list<T>(t: Table): Promise<Doc<T>[]>;
  save<T>(t: Table, d: { id?: string; title: string; data: T }): Promise<Doc<T>>;
  remove(t: Table, id: string): Promise<void>;
}

/** Browser storage, used in preview mode. */
export const localStore: Store = {
  mode: 'local',
  async list<T>(t: Table) { try { return JSON.parse(localStorage.getItem(`ikarvo:${t}`) || '[]') as Doc<T>[]; } catch { return []; } },
  async save<T>(t: Table, d: { id?: string; title: string; data: T }) {
    const all = await this.list<T>(t); const now = new Date().toISOString();
    const prev = all.find(x => x.id === d.id);
    const doc: Doc<T> = { id: d.id || uid(), title: d.title, data: d.data, created_at: prev?.created_at ?? now, updated_at: now };
    localStorage.setItem(`ikarvo:${t}`, JSON.stringify([doc, ...all.filter(x => x.id !== doc.id)].slice(0, 300)));
    return doc;
  },
  async remove(t: Table, id: string) { const all = await this.list(t); localStorage.setItem(`ikarvo:${t}`, JSON.stringify(all.filter(x => x.id !== id))); },
};

/** Tables that belong to a workspace and are shared with its members (see shared_workspaces migration). */
const SHARED = new Set<Table>(['projects','campaigns','posts','listings','brands','articles','visibility','threads','crawls','influencers','backlinks','competitors','reports','docs','ugc','hn','logs','sequences','launches','ads','ad_projects']);
let activeOwner: string | null = null;
/** Owner id of the workspace being viewed (null = your own). Set once at startup from localStorage. */
export function setActiveWorkspace(owner: string | null) { activeOwner = owner; }
export const WS_KEY = 'ikarvo:workspace';

/** Supabase-backed storage. RLS allows your own rows plus rows of workspaces you are an active member of. */
export const cloudStore: Store = {
  mode: 'cloud',
  async list<T>(t: Table) {
    let q = createClient().from(t).select('id,title,data,created_at,updated_at');
    if (activeOwner && SHARED.has(t)) q = q.eq('user_id', activeOwner);
    const { data, error } = await q.order('updated_at', { ascending: false }).limit(300);
    if (error) throw new Error(`${t}: ${error.message}`);
    return (data ?? []) as Doc<T>[];
  },
  async save<T>(t: Table, d: { id?: string; title: string; data: T }) {
    const row = { ...(d.id ? { id: d.id } : {}), ...(activeOwner && SHARED.has(t) ? { user_id: activeOwner } : {}), title: d.title, data: d.data };
    const { data, error } = await createClient().from(t).upsert(row).select('id,title,data,created_at,updated_at').single();
    if (error) throw new Error(`Save failed: ${error.message}`);
    return data as Doc<T>;
  },
  async remove(t: Table, id: string) { const { error } = await createClient().from(t).delete().eq('id', id); if (error) throw new Error(error.message); },
};
