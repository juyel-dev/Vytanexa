import { createClient } from '@/lib/supabase/server';
import { AnnouncementBannerClient } from './AnnouncementBannerClient';

/**
 * Announcement Banner — VYTANEXA-BLUEPRINT.md § S04 SEC-01
 * Queries `notifications` where show_as_banner=true (RLS already
 * restricts to type IN ('general','emergency') + active + unexpired
 * — DATABASE-SCHEMA.md § 4.7 `notifications_read` policy). Max 2
 * shown, newest first, per spec. Dismiss interaction lives in the
 * client wrapper (tap ✕ hides + remembers in localStorage).
 */
export async function AnnouncementBanner() {
  const supabase = createClient();

  const { data: banners, error } = await supabase
    .from('notifications')
    .select('id, type, title, body, target_url')
    .eq('show_as_banner', true)
    .order('created_at', { ascending: false })
    .limit(2);

  if (error) {
    console.error('AnnouncementBanner query failed:', error.message);
    return null;
  }

  if (!banners || banners.length === 0) {
    return null;
  }

  return <AnnouncementBannerClient banners={banners} />;
}
