import type { Metadata } from 'next';
import LegalShell, { Email } from '@/components/legal/LegalShell';
export const metadata: Metadata = { title: 'Accessibility Statement', description: 'Our commitment to an accessible Ikarvo, and how to report a barrier.', alternates: { canonical: '/legal/accessibility' } };
export default function Page() {
  return <LegalShell title="Accessibility Statement">
    <section><p>Ikarvo is committed to making our website and workspace usable by everyone, including people with disabilities. We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA.</p></section>
    <section><h2>What we do</h2><ul><li>Semantic HTML and labelled navigation landmarks</li><li>Keyboard navigation and visible focus states</li><li>Light and dark themes with readable contrast</li><li>Respect for reduced-motion preferences</li></ul></section>
    <section><h2>Known limitations</h2><p>Some generated previews, third-party embeds and media produced by AI tools may not fully meet these standards. We are working to improve them.</p></section>
    <section><h2>Feedback</h2><p>If you encounter a barrier, email <Email /> and we will try to respond within five business days and provide the information in an accessible format.</p></section>
  </LegalShell>;
}
