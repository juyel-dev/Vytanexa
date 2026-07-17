import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { getLocalizedField } from '@/lib/i18n';

const TYPE_LABELS: Record<string, string> = {
  hospital: 'হাসপাতাল',
  clinic: 'ক্লিনিক',
  diagnostic: 'ডায়াগনস্টিক',
  nursing_home: 'নার্সিং হোম',
};

/**
 * Trending Hospitals — VYTANEXA-BLUEPRINT.md § S04 SEC-08
 */
export async function TrendingHospitals() {
  const supabase = createClient();

  const { data: hospitals, error } = await supabase
    .from('hospitals')
    .select('id, slug, name_translations, cover_image_url, type, has_emergency_dept')
    .eq('verification_status', 'verified')
    .order('is_featured', { ascending: false })
    .order('is_trending', { ascending: false })
    .order('rating_avg', { ascending: false })
    .limit(8);

  if (error) {
    console.error('TrendingHospitals query failed:', error.message);
    return null;
  }

  if (!hospitals || hospitals.length === 0) {
    return null;
  }

  return (
    <section className="py-3">
      <div className="mb-3 flex items-center justify-between px-4">
        <h2 className="font-bengali-display text-[17px] font-bold text-neutral-900">
          কাছের হাসপাতাল ও ডায়াগনস্টিক
        </h2>
        <Link href="/hospitals" className="text-[13px] text-brand-600">
          সব দেখুন →
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {hospitals.map((h) => {
          const name = getLocalizedField(h.name_translations);
          return (
            <Link
              key={h.id}
              href={`/hospitals/${h.slug}`}
              className="w-[200px] shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-card"
            >
              <div className="relative h-[110px] w-full bg-neutral-100">
                {h.cover_image_url && (
                  <Image
                    src={h.cover_image_url}
                    alt={name}
                    fill
                    sizes="200px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="p-3">
                <h3 className="line-clamp-2 text-[14px] font-semibold text-neutral-900">
                  {name}
                </h3>
                <span className="mt-1 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-[11px] text-brand-600">
                  {TYPE_LABELS[h.type] ?? h.type}
                </span>
                {h.has_emergency_dept && (
                  <span className="ml-1 inline-block rounded-full bg-emergency-50 px-2 py-0.5 text-[10px] text-emergency-600">
                    🚨 জরুরি
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
