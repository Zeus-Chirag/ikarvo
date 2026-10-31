'use client';
import { useCallback, useEffect, useState } from 'react';
import type { Store, Doc } from './store';

export type AgentKey = 'seo' | 'geo' | 'reddit' | 'x' | 'linkedin' | 'articles' | 'ugc' | 'influencer' | 'competitors' | 'backlinks' | 'hn';
export type Settings = {
  agents: {
    seo: { on: boolean; market: string }; geo: { on: boolean }; influencer: { on: boolean }; competitors: { on: boolean }; backlinks: { on: boolean }; hn: { on: boolean; notes: string };
    reddit: { on: boolean; style: string; region: string; subreddits: string[]; keywords: string[] };
    x: { on: boolean; voice: string }; linkedin: { on: boolean; voice: string };
    articles: { on: boolean; instructions: string; heroImage: boolean; imageStyle: string };
    ugc: { on: boolean; frequency: 'daily' | 'weekly' | 'manual'; autoVideo: 'off' | 'weekly' | 'biweekly'; platform: string };
  };
  personal: { callMe: string; role: string; about: string; language: string; model: string };
  company: { instructions: string; x: string; linkedin: string; category: string; people: string };
  tourDone: boolean; onboarded: boolean;
};
export const DEFAULT_SETTINGS: Settings = {
  agents: { seo: { on: true, market: 'United States (English)' }, geo: { on: true }, influencer: { on: true }, competitors: { on: true }, backlinks: { on: true }, hn: { on: false, notes: '' },
    reddit: { on: true, style: 'Sound like a helpful practitioner. Answer the question first. Mention the product only if it truly fits, and disclose that you build it.', region: 'Global', subreddits: [], keywords: [] },
    x: { on: true, voice: '' }, linkedin: { on: true, voice: '' }, articles: { on: true, instructions: 'Prioritize practical depth over length. Answer first, then explain.', heroImage: false, imageStyle: '' },
    ugc: { on: false, frequency: 'weekly', autoVideo: 'off', platform: 'TikTok' } },
  personal: { callMe: '', role: '', about: '', language: 'English', model: '' },
  company: { instructions: '', x: '', linkedin: '', category: '', people: '' }, tourDone: false, onboarded: false,
};
const CACHE = 'ikarvo:settings-cache';
function merge(s: Partial<Settings> | undefined): Settings {
  const d = DEFAULT_SETTINGS; s = s ?? {};
  return { ...d, ...s, agents: Object.fromEntries(Object.entries(d.agents).map(([k, v]) => [k, { ...v, ...(s!.agents as Record<string, object> | undefined)?.[k] }])) as Settings['agents'], personal: { ...d.personal, ...s.personal }, company: { ...d.company, ...s.company } };
}
/** Last-loaded settings (sync), so prompt builders can include owner instructions without prop drilling. */
export function cachedSettings(): Settings { try { return merge(JSON.parse(localStorage.getItem(CACHE) || 'null') ?? undefined); } catch { return DEFAULT_SETTINGS; } }

export function useSettings(store: Store) {
  const [doc, setDoc] = useState<Doc<Settings> | null>(null); const [s, setS] = useState<Settings>(() => typeof window === 'undefined' ? DEFAULT_SETTINGS : cachedSettings());
  useEffect(() => { store.list<Settings>('settings').then(l => { const d = l[0] ?? null; setDoc(d); const m = merge(d?.data); setS(m); localStorage.setItem(CACHE, JSON.stringify(m)); }).catch(() => {}); }, [store]);
  const save = useCallback(async (next: Settings) => { setS(next); localStorage.setItem(CACHE, JSON.stringify(next)); const d = await store.save<Settings>('settings', { id: doc?.id, title: 'settings', data: next }); setDoc(d); return d; }, [store, doc?.id]);
  return { settings: s, save };
}
export const AGENTS: { key: AgentKey; name: string; what: string; tab: string; cost: string }[] = [
  { key: 'seo', name: 'SEO fixes', what: 'Crawls every page, ranks issues, opens fix PRs on GitHub.', tab: 'crawl', cost: 'free crawl · PR free' },
  { key: 'geo', name: 'AI visibility (GEO)', what: 'Asks AI assistants your buyers\u2019 questions and tracks who gets named and cited.', tab: 'visibility', cost: '8 cr / run' },
  { key: 'reddit', name: 'Reddit & HN', what: 'Finds threads where you genuinely help, drafts a disclosed reply.', tab: 'community', cost: '3 cr / reply' },
  { key: 'x', name: 'X posts', what: 'Plans and writes posts in your voice; publishes only what you approve.', tab: 'calendar', cost: '4 cr / batch' },
  { key: 'linkedin', name: 'LinkedIn posts', what: 'Longer-form posts for founders and teams, approval first.', tab: 'calendar', cost: '4 cr / batch' },
  { key: 'articles', name: 'Articles', what: 'Answer-first SEO articles, sent to your CMS as drafts.', tab: 'articles', cost: '15 cr / article' },
  { key: 'ugc', name: 'UGC videos', what: 'Creator-style short video scripts; renders footage if a media key is set.', tab: 'ugc', cost: '6 cr / batch' },
  { key: 'influencer', name: 'Creators', what: 'Finds YouTube and X creators in your niche and drafts pitches.', tab: 'influencers', cost: '2 cr / pitch' },
  { key: 'backlinks', name: 'Backlinks', what: 'Guest-post, listicle and directory targets with pitch drafts.', tab: 'backlinks', cost: '2 cr / pitch' },
  { key: 'competitors', name: 'Competitor intelligence', what: 'Watches competitor pages and pricing and flags what changed.', tab: 'competitors', cost: 'free' },
  { key: 'hn', name: 'Show HN', what: 'Three plain-spoken Show HN drafts. You post it yourself.', tab: 'hn', cost: '4 cr / set' },
];
