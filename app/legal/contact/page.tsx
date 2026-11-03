import type { Metadata } from 'next';
import LegalShell, { Email, POSTAL_ADDRESS, OWNER } from '@/components/legal/LegalShell';
export const metadata: Metadata = { title: 'Contact', description: 'Contact the Ikarvo team for support, billing, privacy or legal requests.', alternates: { canonical: '/legal/contact' } };
export default function Page() {
  return <LegalShell title="Contact us">
    <section><p>Ikarvo is operated by {OWNER}. We usually reply within two business days.</p>
      <ul><li>Email: <Email /></li><li>Mailing address: {POSTAL_ADDRESS}</li></ul>
      <p>For support, billing, privacy requests (including California rights requests), DMCA notices and accessibility feedback, please email us and include the subject of your request in the subject line.</p></section>
  </LegalShell>;
}
