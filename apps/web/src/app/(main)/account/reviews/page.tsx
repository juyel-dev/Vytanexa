import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { TopBarSection } from '@/components/layout/TopBar';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/current-user';
import { getMyReviews, resolveReviewEntityNames } from '@/lib/queries/account';
import { getLocalizedField, formatRelativeTimeBn } from '@/lib/i18n';
import { Star } from 'lucide-react';
import { getT } from '@vytanexa/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT('account');
  return { title: `${t('rows.myReviews')} | Vytanexa` };
}

/** My Reviews — VYTANEXA-BLUEPRINT.md § S17 "⭐ আমার রিভিউ". Uses `reviews_own_read` (migration 0014). */
export default async function MyReviewsPage() {
  const supabase = createClient();
  const currentUser = await getCurrentUser(supabase);
  if (!currentUser) redirect('/auth/login?returnUrl=/account/reviews');

  const t = await getT('account');
  const tReviews = await getT('reviews');
  const reviews = await getMyReviews(supabase, currentUser.authUser.id);
  const entityNames = await resolveReviewEntityNames(supabase, reviews);

  return (
    <>
      <TopBarSection title={t('rows.myReviews')} backHref="/account" />
      <div className="px-4 py-4">
        {reviews.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-neutral-400">
            {t('myReviews.noReviewsYet')}
          </p>
        ) : (
          reviews.map((r) => {
            const entity = entityNames.get(r.entity_id);
            const entityHref =
              r.entity_type === 'doctor'
                ? `/doctors/${entity?.slug}`
                : `/hospitals/${entity?.slug}`;

            return (
              <div key={r.id} className="mb-3 rounded-lg border border-neutral-200 p-3.5">
                {entity ? (
                  <Link href={entityHref} className="text-[14px] font-semibold text-brand-700">
                    {getLocalizedField(entity.name_translations)}
                  </Link>
                ) : (
                  <p className="text-[14px] font-semibold text-neutral-500">{t('myReviews.entityNotFound')}</p>
                )}
                <div className="mt-1 flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${
                        i <= r.rating ? 'fill-accent-500 text-accent-500' : 'text-neutral-200'
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-1.5 text-[14px] text-neutral-700">{r.review_text}</p>
                {r.admin_reply && (
                  <div className="mt-2 rounded-md bg-brand-50 p-2.5">
                    <p className="text-[12px] font-semibold text-brand-700">
                      💬 {tReviews(`responseFrom.${r.entity_type}` as Parameters<typeof tReviews>[0])}:
                    </p>
                    <p className="text-[13px] text-neutral-700">{r.admin_reply}</p>
                  </div>
                )}
                <p className="mt-1.5 text-[12px] text-neutral-400">
                  {t.has(`status.moderation.${r.status}` as Parameters<typeof t>[0])
                    ? t(`status.moderation.${r.status}` as Parameters<typeof t>[0])
                    : r.status}{' '}
                  · {formatRelativeTimeBn(r.created_at)}
                </p>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
