import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { TopBarSection } from '@/components/layout/TopBar';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/current-user';
import { getLeadsHistory } from '@/lib/queries/account';
import { getLocalizedField, formatRelativeTimeBn } from '@/lib/i18n';
import { getT } from '@vytanexa/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT('account');
  return { title: `${t('rows.appointmentHistory')} | Vytanexa` };
}

const STATUS_DOTS: Record<string, string> = {
  new: '🟡',
  contacted: '🟢',
  completed: '✅',
  cancelled: '⚪',
  spam: '⚪',
};

/**
 * Appointment History — VYTANEXA-BLUEPRINT.md § S17: "Read-only log
 * of the user's own leads submissions ... no patient self-update.
 * Sets correct expectation: this is a request log, not a live booking
 * calendar." Status changes only ever happen chamber/admin-side.
 */
export default async function HistoryPage() {
  const supabase = createClient();
  const currentUser = await getCurrentUser(supabase);
  if (!currentUser) redirect('/auth/login?returnUrl=/account/history');

  const t = await getT('account');
  const history = await getLeadsHistory(supabase, currentUser.authUser.id);

  return (
    <>
      <TopBarSection title={t('rows.appointmentHistory')} backHref="/account" />
      <div className="px-4 py-4">
        {history.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-neutral-400">
            {t('history.noHistoryYet')}
          </p>
        ) : (
          history.map((lead) => {
            const statusKey = lead.status as keyof typeof STATUS_DOTS;
            const dot = STATUS_DOTS[lead.status] ?? STATUS_DOTS.new;
            const statusPath = `status.lead.${statusKey}` as Parameters<typeof t>[0];
            const label = t.has(statusPath) ? t(statusPath) : lead.status;
            const doctorName = lead.doctors
              ? getLocalizedField(lead.doctors.name_translations)
              : null;
            const specialty = lead.doctors?.categories
              ? getLocalizedField(lead.doctors.categories.name_translations)
              : null;

            return (
              <div
                key={lead.id}
                className="mb-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-card"
              >
                {doctorName && (
                  <Link
                    href={`/doctors/${lead.doctors!.slug}`}
                    className="text-[15px] font-bold text-neutral-900"
                  >
                    {doctorName}
                    {specialty && (
                      <span className="ml-1 text-[13px] font-normal text-neutral-500">
                        — {specialty}
                      </span>
                    )}
                  </Link>
                )}
                <p className="mt-1 text-[12px] text-neutral-500">
                  📅 {t('history.requestedAgo', { time: formatRelativeTimeBn(lead.created_at) })}
                </p>
                <p className="mt-1.5 text-[13px] font-medium">
                  {dot} {label}
                </p>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
