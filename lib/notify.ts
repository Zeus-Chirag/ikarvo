import 'server-only';
import { envValue } from '@/lib/env';
export const NOTIFY = {
  telegram: { label: 'Telegram', keys: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'] },
  whatsapp: { label: 'WhatsApp (Cloud API)', keys: ['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_TO'] },
} as const;
export type NotifyChannel = keyof typeof NOTIFY;
export const notifyMissing = (c: NotifyChannel) => NOTIFY[c].keys.filter(k => !envValue(k));
/** Sends to the owner's own chat (configured in env). Used only for digests and test messages the owner triggers. */
export async function notify(c: NotifyChannel, text: string) {
  if (notifyMissing(c).length) throw Object.assign(new Error(`${NOTIFY[c].label} is not configured.`), { keys: notifyMissing(c) });
  const r = c === 'telegram'
    ? await fetch(`https://api.telegram.org/bot${envValue('TELEGRAM_BOT_TOKEN')}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: envValue('TELEGRAM_CHAT_ID'), text: text.slice(0, 4000), disable_web_page_preview: true }) })
    : await fetch(`https://graph.facebook.com/${envValue('META_GRAPH_VERSION') || 'v26.0'}/${envValue('WHATSAPP_PHONE_NUMBER_ID')}/messages`, { method: 'POST', headers: { Authorization: `Bearer ${envValue('WHATSAPP_TOKEN')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ messaging_product: 'whatsapp', to: envValue('WHATSAPP_TO'), type: 'text', text: { body: text.slice(0, 4000) } }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.ok === false) throw new Error(`${NOTIFY[c].label} error (${r.status}): ${d.description ?? d.error?.message ?? 'unknown'}`);
  return { ok: true };
}
