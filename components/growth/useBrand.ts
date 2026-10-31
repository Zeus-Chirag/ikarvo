'use client';
import { useCallback, useEffect, useState } from 'react';
import { useWs } from '../ws';
import type { Doc } from '@/lib/client/store';
import type { Check } from './types';
import { cachedSettings, type AgentKey } from '@/lib/client/settings';

export type BrandDocs = {
  product: { name: string; oneLiner: string; whatItDoes: string; features: string[]; pricingSeen: string; category: string };
  positioning: { icp: { segment: string; pain: string; trigger: string }[]; statement: string; messagingPillars: { pillar: string; proof: string }[]; objections: { objection: string; answer: string }[] };
  competitors: { name: string; angle: string; howWeDiffer: string }[];
  voice: { traits: string[]; do: string[]; dont: string[]; sampleLine: string };
  keywords: { keyword: string; intent: string; why: string }[];
  plan: { week: number; focus: string; actions: { channel: string; task: string; effort: string }[] }[];
};
export type Competitor = { name: string; domain: string; why?: string; source?: string };
export type Brand = { url: string; notes: string; competitorsFound?: Competitor[]; extraDocs?: Record<string, unknown>; design?: unknown; pagespeed?: { scores: Record<string, number | null>; at: string }; files?: { name: string; text: string; at: string }[]; audit?: { score: number; checks: Check[]; page: { title: string; description: string; h1: string[]; text: string; wordCount: number }; at: string }; docs?: BrandDocs; done?: string[] };

/** The active brand brief: the latest saved document in the `brands` table. Shared context for every growth tool. */
export function useBrand() {
  const { store } = useWs();
  const [doc, setDoc] = useState<Doc<Brand> | null | undefined>(undefined);
  useEffect(() => { const load = () => store.list<Brand>('brands').then(l => { const a = localStorage.getItem('ikarvo:activeBrand'); setDoc(l.find(x => x.id === a) ?? l[0] ?? null); }).catch(() => setDoc(null));
    load(); window.addEventListener('ikarvo:brand', load); return () => window.removeEventListener('ikarvo:brand', load); }, [store]);
  const save = useCallback(async (data: Brand, title?: string) => { const d = await store.save<Brand>('brands', { id: doc?.id, title: title || data.docs?.product.name || data.url || 'Brand', data }); setDoc(d); localStorage.setItem('ikarvo:activeBrand', d.id); return d; }, [store, doc?.id]);
  return { brand: doc?.data ?? null, brandId: doc?.id ?? null, loading: doc === undefined, save };
}

/** Compact text form of the brief that is sent as context to generators. */
export function briefFor(b: Brand | null, agent?: AgentKey) {
  const base = briefCore(b); if (typeof window === 'undefined') return base; const s = cachedSettings(); const a = agent ? s.agents[agent] as Record<string, unknown> : null;
  const extra = [s.company.instructions && `Owner's general instructions: ${s.company.instructions}`, a && ((a.instructions || a.voice || a.style) as string) && `Instructions for this channel: ${(a.instructions || a.voice || a.style) as string}`,
    s.personal.language && s.personal.language !== 'English' && `Write in: ${s.personal.language}`, b?.files?.length && `Owner-provided context files: ${b.files.map(f => `${f.name}: ${f.text.slice(0, 600)}`).join(' | ')}`].filter(Boolean);
  return extra.length ? `${base}\n${extra.join('\n')}` : base;
}
function briefCore(b: Brand | null) {
  if (!b?.docs) return b?.audit ? `Website: ${b.url}\nTitle: ${b.audit.page.title}\nDescription: ${b.audit.page.description}\nNotes: ${b.notes}` : '';
  const d = b.docs;
  return [`Product: ${d.product.name}. ${d.product.oneLiner} ${d.product.whatItDoes}`, `Features: ${d.product.features.join('; ')}`, `Positioning: ${d.positioning.statement}`,
    `ICP: ${d.positioning.icp.map(i => `${i.segment} (pain: ${i.pain})`).join('; ')}`, `Pillars: ${d.positioning.messagingPillars.map(p => p.pillar).join('; ')}`,
    `Voice: ${d.voice.traits.join(', ')}. Do: ${d.voice.do.join('; ')}. Don't: ${d.voice.dont.join('; ')}`, `Competitors: ${d.competitors.map(c => c.name).join(', ')}`, `Website: ${b.url}`].join('\n');
}
