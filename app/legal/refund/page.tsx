import type { Metadata } from 'next';
import LegalShell, { CONTACT_EMAIL, OWNER } from '@/components/legal/LegalShell';
export const metadata: Metadata = { title: 'Refund & Cancellation Policy · Ikarvo', alternates: { canonical: '/legal/refund' } };
export default function Page() {
  return <LegalShell title="Refund & Cancellation Policy">
    <section><h2>Subscriptions</h2><p>Paid Ikarvo plans are billed in advance in US dollars (USD) on a monthly or annual basis through our payment processor, Stripe. Prices shown exclude applicable US sales tax, which is added at checkout where required.</p></section>
    <section><h2>Cancelling</h2><p>You can cancel at any time from <strong>Billing → Manage subscription</strong> in the workspace. Cancellation stops future renewals; you keep access until the end of the current billing period. We do not charge cancellation fees.</p></section>
    <section><h2>Refunds</h2><p>If you are charged for a renewal you did not intend, contact us within 14 days of the charge and we will refund it in full provided the paid features were not substantially used in that period. Annual plans cancelled within 14 days of first purchase are refundable in full. Otherwise, fees are non-refundable except where required by law. AI credits that have been consumed are not refundable.</p></section>
    <section><h2>Billing errors</h2><p>If you believe you were charged in error, email us and we will investigate and correct any confirmed error promptly. Refunds go back to the original payment method, typically within 5–10 business days.</p></section>
    <section><h2>Contact</h2><p>Ikarvo, operated by {OWNER} — <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p></section>
  </LegalShell>;
}
