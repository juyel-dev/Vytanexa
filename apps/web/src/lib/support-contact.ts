import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@vytanexa/database';

/**
 * Support WhatsApp number, managed by the admin in
 * God Mode -> Footer (`app_settings.contact_whatsapp`). Returns digits
 * only, with country code, ready for `https://wa.me/<number>`.
 * A bare 10-digit Indian number gets `91` prepended. Returns '' when
 * unset/invalid — callers must then HIDE the WhatsApp CTA rather than
 * link to a bare `https://wa.me/` (a dead-end landing page).
 */
export async function getSupportWhatsapp(supabase: SupabaseClient<Database>): Promise<string> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('contact_whatsapp')
    .eq('id', 1)
    .single();
  if (error || !data?.contact_whatsapp) return '';
  let digits = data.contact_whatsapp.replace(/\D/g, '');
  if (digits.length === 10) digits = `91${digits}`;
  return digits.length >= 11 && digits.length <= 15 ? digits : '';
}
