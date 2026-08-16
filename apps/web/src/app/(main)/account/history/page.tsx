import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { TopBarSection } from '@/components/layout/TopBar';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/current-user';
import { getLeadsHistory } from '@/lib/queries/account';
import { getLocalizedField, formatRelativeTimeBn } from '@/lib/i18n';

export const metadata: Metadata = { title: 'অ্যাপয়েন্টমেন্ট হিস্টরি | Vytanexa' };

const STATUS_LABELS: Record<string, { label: string; dot: string }> = {
  new: { label: 'অপেক্ষমাণ', dot: '🟡' },
  contacted: { label: 'যোগাযোগ করা হয়েছে', dot: '🟢' },
  completed: { label: 'সম্পন্ন', dot: '✅' },
  cancelled: { label: 'বাতিল', dot: '⚪' },
  spam: { label: 'বাতিল', dot: '⚪' },
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

  const history = await getLeadsHistory(supabase, currentUser.authUser.id);

  return (
    <>
      <TopBarSection title="অ্যাপয়েন্টমেন্ট হিস্টরি" backHref="/account" />
      <div className="px-4 py-4">
        {history.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-neutral-400">
            এখনো কোনো অ্যাপয়েন্টমেন্ট অনুরোধ নেই
          </p>
        ) : (
          history.map((lead) => {
            const status = STATUS_LABELS[lead.status] ?? STATUS_LABELS.new!;
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
                  📅 {formatRelativeTimeBn(lead.created_at)} অনুরোধ করা হয়েছে
                </p>
                <p className="mt-1.5 text-[13px] font-medium">
                  {status.dot} {status.label}
                </p>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
