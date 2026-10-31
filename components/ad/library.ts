import { uid, type Brand, type Project, type Scene } from './engine';

const sc = (o: Partial<Scene> & Pick<Scene, 'template' | 'headline'>): Scene => ({ id: uid(), dur: 2.6, anim: 'rise', transition: 'fade', bg: 'solid', ...o });
export const DEFAULT_BRAND: Brand = { name: 'Ledgerly', bg: '#f4f0e6', fg: '#14130f', accent: '#e8492a', accent2: '#2f6b46', display: 'var(--font-display), Georgia, serif', body: 'var(--font-sans), system-ui, sans-serif', url: 'ledgerly.app' };

/** Our own starting structures for launch videos. Copy is placeholder and meant to be replaced. */
export const TEMPLATES: { id: string; name: string; desc: string; aspect: Project['aspect']; scenes: () => Scene[] }[] = [
  { id: 'launch', name: 'Product launch', desc: 'Problem → reveal → 3 features → CTA', aspect: '16:9', scenes: () => [
    sc({ template: 'kinetic', headline: 'Books. Taxes. Invoices. Every. Single. Month.', dur: 3.2, transition: 'cut', tone: 'dark' }),
    sc({ template: 'title', kicker: 'Introducing', headline: 'Ledgerly 2.0', sub: 'Bookkeeping that finishes itself.', anim: 'mask', bg: 'gradient', transition: 'zoom', dur: 3 }),
    sc({ template: 'device', kicker: 'Feature 01', headline: 'Bank feeds that sort themselves', sub: 'Every transaction categorised before you open the app.', device: 'browser', transition: 'push', dur: 3.4 }),
    sc({ template: 'device', kicker: 'Feature 02', headline: 'Tax set aside per invoice', sub: 'A fixed percentage, moved the moment you get paid.', device: 'phone', transition: 'push', dur: 3.4 }),
    sc({ template: 'stat', stat: '10 min', headline: 'a week on your books, start to finish', sub: 'Measured on your own account, not ours.', transition: 'wipe', tone: 'accent', dur: 3 }),
    sc({ template: 'cta', headline: 'Close the month before lunch.', sub: 'Start free', transition: 'fade', anim: 'pop', bg: 'gradient', dur: 3 }) ] },
  { id: 'feature', name: 'Feature drop', desc: 'One feature, shown in a device, for social', aspect: '9:16', scenes: () => [
    sc({ template: 'title', kicker: 'New', headline: 'Receipts, matched for you', sub: 'Snap it. Forget it.', anim: 'split', bg: 'grid', transition: 'cut', dur: 2.8 }),
    sc({ template: 'device', headline: 'Point your camera at any receipt', device: 'phone', transition: 'slide', dur: 3.6 }),
    sc({ template: 'feature', headline: 'It finds the matching payment', device: 'phone', items: ['Any currency', 'Offline', 'Under 2 s'], transition: 'slide', dur: 3.6 }),
    sc({ template: 'cta', headline: 'Out today for everyone', sub: 'Update the app', transition: 'zoom', anim: 'pop', tone: 'dark', dur: 2.8 }) ] },
  { id: 'explainer', name: '3-step explainer', desc: 'How it works in three steps', aspect: '1:1', scenes: () => [
    sc({ template: 'title', headline: 'How Ledgerly works', sub: 'Three steps, about four minutes.', anim: 'mask', bg: 'gradient', transition: 'cut', dur: 2.6 }),
    sc({ template: 'steps', headline: 'Set it up once', items: ['Connect your bank', 'Pick your tax rate', 'Send your first invoice'], transition: 'push', dur: 4.6 }),
    sc({ template: 'device', headline: 'Then it just runs', device: 'laptop', transition: 'push', dur: 3.4 }),
    sc({ template: 'cta', headline: 'Try it on your own numbers', sub: 'Start free', transition: 'fade', anim: 'pop', dur: 2.8 }) ] },
  { id: 'milestone', name: 'Milestone / metric', desc: 'Big number, story, thank-you', aspect: '4:5', scenes: () => [
    sc({ template: 'stat', stat: '25,000', headline: 'freelancers closed their books with us this year', transition: 'cut', tone: 'dark', dur: 3.4 }),
    sc({ template: 'title', headline: 'Thank you for every bug report.', sub: 'Here is what we are building next.', anim: 'rise', transition: 'fade', dur: 3 }),
    sc({ template: 'steps', headline: 'Next on the roadmap', items: ['Multi-currency', 'Accountant access', 'Year-end pack'], transition: 'push', dur: 4.2 }),
    sc({ template: 'cta', headline: 'Build it with us', sub: 'Join the beta', transition: 'zoom', anim: 'pop', bg: 'gradient', dur: 2.8 }) ] },
  { id: 'teaser', name: 'Countdown teaser', desc: 'Kinetic type, short and loud', aspect: '9:16', scenes: () => [
    sc({ template: 'kinetic', headline: 'Something new is coming', dur: 2.6, transition: 'cut', tone: 'dark' }),
    sc({ template: 'stat', stat: '3', headline: 'days', transition: 'cut', tone: 'accent', dur: 1.2 }), sc({ template: 'stat', stat: '2', headline: 'days', transition: 'cut', tone: 'dark', dur: 1.2 }), sc({ template: 'stat', stat: '1', headline: 'day', transition: 'cut', tone: 'accent', dur: 1.2 }),
    sc({ template: 'cta', headline: 'Thursday, 9am', sub: 'Get notified', anim: 'pop', transition: 'zoom', bg: 'grid', dur: 2.8 }) ] },
];
export const newProject = (tplId = 'launch', brand: Brand = DEFAULT_BRAND): Project => { const t = TEMPLATES.find(x => x.id === tplId) ?? TEMPLATES[0]; return { id: uid(), name: t.name, aspect: t.aspect, fps: 30, brand, scenes: t.scenes(), grain: true }; };

/** Hook formulas, written for Ikarvo. {X} slots are filled from the product brief. */
export const HOOKS: { cat: string; hooks: string[] }[] = [
  { cat: 'Pain first', hooks: ['I was losing {hours} a week to {pain} until this.', 'If {pain} is your least favourite part of the week, watch this.', 'Nobody warned me {pain} would be this annoying.', 'Stop doing {pain} by hand.'] },
  { cat: 'Outcome', hooks: ['This is how I {outcome} in {time}.', 'Here is what {outcome} actually looks like.', '{time} ago I could not {outcome}. Now it takes one tap.'] },
  { cat: 'Contrast', hooks: ['{old way} vs {product}. Same task.', 'I tried {competitor} for a month. Then I switched.', 'Everyone uses {old way}. Here is the faster way.'] },
  { cat: 'Curiosity', hooks: ['The setting nobody tells you about in {category}.', 'I did not expect a {category} app to do this.', 'Wait for the last step.'] },
  { cat: 'Audience call-out', hooks: ['{audience}, this one is for you.', 'If you are a {audience} and you still {pain}, stop scrolling.', 'POV: you are a {audience} at the end of the month.'] },
  { cat: 'Demo', hooks: ['Watch me {task} in under {time}.', 'Three taps. That is the whole workflow.', 'Real screen, no edits: {task}.'] },
];
export const fillHook = (h: string, v: Record<string, string>) => h.replace(/\{(\w+(?: \w+)?)\}/g, (_, k) => v[k] || v[k.replace(' ', '')] || `[${k}]`);

export const STATIC_SIZES = [
  { id: 'feed-sq', label: 'Feed square', w: 1080, h: 1080, where: 'Meta, LinkedIn, X' }, { id: 'feed-45', label: 'Feed portrait', w: 1080, h: 1350, where: 'Meta, Instagram' },
  { id: 'story', label: 'Story / Reel', w: 1080, h: 1920, where: 'Stories, TikTok, Shorts' }, { id: 'link', label: 'Link / landscape', w: 1200, h: 628, where: 'LinkedIn, X, Google Display' },
  { id: 'display', label: 'Display rectangle', w: 1200, h: 1200, where: 'Google Display (responsive)' },
] as const;
export type StaticLayout = 'headline' | 'product' | 'split' | 'list' | 'quote';
