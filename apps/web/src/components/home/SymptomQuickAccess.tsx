import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { getLocalizedField } from '@/lib/i18n';

/**
 * Symptom Quick Access — VYTANEXA-BLUEPRINT.md § S04 SEC-09
 * First section to use the `symptoms` table added to close the
 * schema gap found in TODO.md — emergency symptoms get a distinct
 * red-flagged treatment per spec.
 */
export async function SymptomQuickAccess() {
  const supabase = createClient();

  const { data: symptoms, error } = await supabase
    .from('symptoms')
    .select('id, slug, title_translations, cover_image_url, is_emergency')
    .eq('is_active', true)
    .order('is_emergency', { ascending: false })
    .order('display_order', { ascending: true })
    .limit(12);

  if (error) {
    console.error('SymptomQuickAccess query failed:', error.message);
    return null;
  }

  if (!symptoms || symptoms.length === 0) {
    return null;
  }

  return (
    <section className="py-3">
      <div className="mb-3 flex items-center justify-between px-4">
        <h2 className="font-bengali-display text-[17px] font-bold text-neutral-900">
          উপসর্গ দেখে ডাক্তার খুঁজুন
        </h2>
        <Link href="/symptoms" className="text-[13px] text-brand-600">
          সব দেখুন →
        </Link>
      </div>

      <div className="grid auto-cols-[140px] grid-flow-col grid-rows-2 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {symptoms.map((s) => {
          const title = getLocalizedField(s.title_translations);
          return (
            <Link
              key={s.id}
              href={`/symptoms/${s.slug}`}
              className={`relative h-[100px] w-[140px] overflow-hidden rounded-lg ${
                s.is_emergency ? 'ring-2 ring-emergency-600' : ''
              }`}
            >
              <div className="absolute inset-0 bg-neutral-200">
                {s.cover_image_url && (
                  <Image
                    src={s.cover_image_url}
                    alt={title}
                    fill
                    sizes="140px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
              {s.is_emergency && (
                <span className="absolute left-1.5 top-1.5 text-sm">🚨</span>
              )}
              <span className="absolute bottom-2 left-2 right-2 text-[12px] font-semibold text-white">
                {title}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
