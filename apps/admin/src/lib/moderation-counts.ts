import 'server-only';
import { createServiceRoleClient } from './supabase/service-role';

/**
 * TODO.md Phase 9.4. nav-config.ts's moderation items had
 * `badgeCount: 0` hardcoded literals — since NAV_GROUPS is a static
 * module-level const, that count could never have been anything but
 * 0, for any admin, ever, regardless of actual pending items. This
 * fetches the real counts (same three counts each moderation page
 * already computes for its own tabs) once per dashboard layout render,
 * keyed by href so Sidebar.tsx can merge them into NAV_GROUPS at
 * render time instead of trusting the static field.
 */
export async function getModerationBadgeCounts(): Promise<Record<string, number>> {
  const supabase = createServiceRoleClient();
  const [reviews, questions, reports] = await Promise.all([
    supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('status', 'pending').is('deleted_at', null),
    supabase.from('questions').select('id', { count: 'exact', head: true }).eq('status', 'pending').is('deleted_at', null),
    supabase.from('data_reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
  ]);

  return {
    '/moderation/reviews': reviews.count ?? 0,
    '/moderation/qa': questions.count ?? 0,
    '/moderation/reports': reports.count ?? 0,
  };
}
