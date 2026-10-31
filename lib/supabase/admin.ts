import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { envValue } from '@/lib/env';
/** Service-role client for trusted server work (webhooks). Never import in client code. */
export function adminClient() {
  const url = envValue('NEXT_PUBLIC_SUPABASE_URL'); const key = envValue('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
