import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@vytanexa/database';

/**
 * Notifications Center — VYTANEXA-BLUEPRINT.md § S20. RLS
 * (`notifications_public_read` + `notifications_personal_read`,
 * DATABASE-SCHEMA.md § 4.7) already scopes `personal` notifications to
 * their `target_user_id` and lets everyone see `general`/`emergency`
 * — a single query naturally returns the right set for both guests
 * and signed-in users, no branching needed here.
 */
export async function getNotifications(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, body, target_url, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(50);

  // Throw (don't return []): a failed query used to render the
  // "no notifications" empty state, hiding an outage as "all clear".
  if (error) throw new Error(`getNotifications failed: ${error.message}`);
  return data ?? [];
}

/**
 * Read-state for signed-in users only — VYTANEXA-BLUEPRINT.md § S20:
 * "read-state tracked via localStorage read_notification_ids[] for
 * guests, DB notification_reads table for signed-in users." Guests'
 * read-state is resolved entirely client-side (`NotificationsClient`
 * reads `localStorage` on mount) since there's nowhere server-side to
 * look it up for them.
 */
export async function getReadNotificationIds(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  const { data, error } = await supabase
    .from('notification_reads')
    .select('notification_id')
    .eq('user_id', userId);

  // Read-state is cosmetic: on failure show everything as unread rather
  // than failing the whole page.
  if (error) {
    console.error('getReadNotificationIds failed:', error.message);
    return [];
  }
  return (data ?? []).map((r) => r.notification_id);
}
