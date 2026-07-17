import { createClient } from '@/lib/supabase/server';
import { AlertTriangle, Info } from 'lucide-react';

/**
 * Announcement Banner — VYTANEXA-BLUEPRINT.md § S04 SEC-01
 * Queries `notifications` where show_as_banner=true (RLS already
 * restricts to type IN ('general','emergency') + active + unexpired
 * — DATABASE-SCHEMA.md § 4.7 `notifications_read` policy). Max 2
 * shown, newest first, per spec.
 *
 * Dismiss-to-localStorage interaction (spec: tap ✕ hides + remembers)
 * is a client-side concern deferred to a follow-up pass — this server
 * component renders the correct data-driven content; dismissal is a
 * progressive enhancement on top, not required for correctness today.
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

  return (
    <section className="flex flex-col gap-2 px-4 pt-2">
      {banners.map((banner) => {
        const isEmergency = banner.type === 'emergency';
        return (
          <div
            key={banner.id}
            className={`flex items-start gap-2 rounded-md border-l-4 p-3 ${
              isEmergency
                ? 'border-emergency-600 bg-emergency-50'
                : 'border-brand-600 bg-brand-50'
            }`}
          >
            {isEmergency ? (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-emergency-600" />
            ) : (
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-neutral-900">
                {banner.title}
              </p>
              <p className="line-clamp-2 text-[13px] text-neutral-600">{banner.body}</p>
            </div>
          </div>
        );
      })}
    </section>
  );
}
