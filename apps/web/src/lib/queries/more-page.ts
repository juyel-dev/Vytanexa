import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@vytanexa/database';

/**
 * Custom Pages menu injection — VYTANEXA-BLUEPRINT.md § S16 "Custom
 * Pages Injection (Admin God Mode)": "Rendered from custom_pages
 * WHERE show_in_menu=true ORDER BY menu_order ... routes to
 * /page/[slug] ... zero app redeploy, fully data-driven menu." RLS
 * (`custom_pages_public_read`) already filters to published pages.
 */
export async function getMenuCustomPages(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from('custom_pages')
    .select('slug, title, menu_icon')
    .eq('show_in_menu', true)
    .order('menu_order');

  if (error) {
    console.error('getMenuCustomPages failed:', error.message);
    return [];
  }
  return data ?? [];
}

/**
 * Notification badge — VYTANEXA-BLUEPRINT.md § S16 "Notification
 * Badge": "Small red dot on 'নোটিফিকেশন' row if unread notifications
 * exist (mirrors bottom-nav bell badge state, single source of truth
 * from notifications_read_status)." Guests never have personal
 * notifications and general/emergency ones aren't tracked per-user,
 * so this only checks the signed-in case; callers pass `null` for
 * guests and get `false` back immediately.
 */
export async function hasUnreadNotifications(
  supabase: SupabaseClient<Database>,
  userId: string | null
): Promise<boolean> {
  if (!userId) return false;

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('id')
    .eq('is_active', true)
    .or(`type.in.(general,emergency),and(type.eq.personal,target_user_id.eq.${userId})`);

  if (error || !notifications || notifications.length === 0) return false;

  const { data: reads } = await supabase
    .from('notification_reads')
    .select('notification_id')
    .eq('user_id', userId);

  const readIds = new Set((reads ?? []).map((r) => r.notification_id));
  return notifications.some((n) => !readIds.has(n.id));
}
