import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { DoctorCard } from '@/components/shared/DoctorCard';
import { getT } from '@vytanexa/i18n/server';

/**
 * Popular Doctors — VYTANEXA-BLUEPRINT.md § S04 SEC-06
 * Location-filtered sort is NOT wired here — not because the location
 * system doesn't exist (it does, e.g. doctor-list.ts's district
 * filter, used by the client-side /doctors list), but because this is
 * an SSR Server Component per S04's own performance strategy ("SEC
 * 1-6: SSR"), and the user's selected district lives in
 * `useLocationStore`'s localStorage-only Zustand store — not
 * server-readable without a cookie bridge that doesn't exist yet.
 * Sorted by featured status then rating (the spec's own secondary
 * sort key) until that bridge is built.
 */
export async function PopularDoctors() {
  const supabase = createClient();
  const t = await getT('home.popularDoctorsSection');
  const tCommon = await getT('common');

  const { data: doctors, error } = await supabase
    .from('doctors')
    .select(
      `id, slug, name_translations, photo_url, experience_years,
       rating_avg, rating_count, consultation_fee_min, consultation_fee_max,
       is_featured, whatsapp_number, categories(name_translations)`
    )
    .eq('verification_status', 'verified')
    .order('is_featured', { ascending: false })
    .order('rating_avg', { ascending: false })
    .limit(5);

  if (error) {
    console.error('PopularDoctors query failed:', error.message);
    return null;
  }

  if (!doctors || doctors.length === 0) {
    return null;
  }

  return (
    <section className="py-3">
      <div className="mb-3 flex items-center justify-between px-4">
        <div>
          <h2 className="font-bengali-display text-[17px] font-bold text-neutral-900">
            {t('heading')}
          </h2>
          <p className="text-[12px] text-neutral-500">{t('subtitle')}</p>
        </div>
        <Link href="/doctors" className="text-[13px] text-brand-600">
          {tCommon('seeAll')} →
        </Link>
      </div>

      {doctors.map((doctor) => (
        <DoctorCard key={doctor.id} doctor={doctor} />
      ))}
    </section>
  );
}
