import type { Metadata } from 'next';
import LegalShell, { Email, POSTAL_ADDRESS } from '@/components/legal/LegalShell';
export const metadata: Metadata = { title: 'DMCA / Copyright Policy', description: 'How to report copyright infringement on Ikarvo.', alternates: { canonical: '/legal/dmca' } };
export default function Page() {
  return <LegalShell title="DMCA / Copyright Policy">
    <section><p>Ikarvo respects intellectual property rights and responds to notices of alleged infringement under the Digital Millennium Copyright Act (17 U.S.C. § 512).</p></section>
    <section><h2>Filing a notice</h2><p>Send a written notice to our designated agent containing: (1) your physical or electronic signature; (2) identification of the copyrighted work; (3) identification of the infringing material and where it is located on Ikarvo; (4) your contact information; (5) a statement that you have a good-faith belief the use is not authorized by the owner, its agent, or the law; and (6) a statement, under penalty of perjury, that the information is accurate and that you are authorized to act on the owner&rsquo;s behalf.</p></section>
    <section><h2>Designated agent</h2><p>DMCA Agent, Ikarvo<br />{POSTAL_ADDRESS}<br />Email: <Email /></p></section>
    <section><h2>Counter-notice</h2><p>If your content was removed and you believe it was a mistake or misidentification, you may send a counter-notice including the elements required by 17 U.S.C. § 512(g)(3). We may restore the material in 10–14 business days unless the complainant files a court action.</p></section>
    <section><h2>Repeat infringers</h2><p>We terminate accounts of users who are repeat infringers in appropriate circumstances.</p></section>
  </LegalShell>;
}
