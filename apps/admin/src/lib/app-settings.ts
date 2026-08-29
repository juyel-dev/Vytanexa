import 'server-only';
import { createServiceRoleClient } from './supabase/service-role';
import type { Database } from '@vytanexa/database';

export type AppSettingsRow = Database['public']['Tables']['app_settings']['Row'];

/**
 * Fetch singleton app_settings (id=1). Creates it if missing (defensive).
 */
export async function getAppSettings(): Promise<AppSettingsRow | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase.from('app_settings').select('*').eq('id', 1).maybeSingle();
  if (data) return data as AppSettingsRow;
  // singleton missing (fresh DB before migration seed) — create
  const { data: created } = await supabase.from('app_settings').insert({ id: 1 } as never).select().single();
  return (created as AppSettingsRow) ?? null;
}
