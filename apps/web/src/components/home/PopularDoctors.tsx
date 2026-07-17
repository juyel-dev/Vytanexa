import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { DoctorCard } from '@/components/shared/DoctorCard';

/**
 * Popular Doctors — VYTANEXA-BLUEPRINT.md § S04 SEC-06
 * Location-filtered sort is deferred until the Location system (S02/
 * S03) is built — for now, sorted by featured status then rating,
 * which is the spec's own secondary sort key anyway.
 */
export async function PopularDoctors() {
  const supabase = createClient();

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
            জনপ্রিয় বিশেষজ্ঞ ডাক্তার
          </h2>
          <p className="text-[12px] text-neutral-500">সেরা রেটিং প্রাপ্ত ডাক্তার</p>
        </div>
        <Link href="/doctors" className="text-[13px] text-brand-600">
          সব দেখুন →
        </Link>
      </div>

      {doctors.map((doctor) => (
        <DoctorCard key={doctor.id} doctor={doctor} />
      ))}
    </section>
  );
}
