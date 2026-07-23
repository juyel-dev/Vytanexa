import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getDoctorBySlug } from '@/lib/queries/doctor-detail';
import { getLocalizedField } from '@/lib/i18n';
import { DoctorProfileClient } from '@/components/doctor-profile/DoctorProfileClient';

// ISR: revalidate hourly per S02 § 3.2 ("revalidate: 1 hour for
// profiles"). Combined with `cookies()` usage inside createClient()
// this still ends up dynamically rendered per-request in practice
// (same honest caveat as the Home page) -- documented rather than
// silently claimed as cached.
export const revalidate = 3600;

async function loadDoctor(slug: string) {
  const supabase = createClient();
  return getDoctorBySlug(supabase, slug);
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const doctor = await loadDoctor(params.slug);
  if (!doctor) return { title: 'ডাক্তার পাওয়া যায়নি | Vytanexa' };

  const name = getLocalizedField(doctor.name_translations);
  const specialty = doctor.categories
    ? getLocalizedField(doctor.categories.name_translations)
    : '';
  const title = `${name} — ${specialty} | Vytanexa`;
  const description = `${name}, একজন ${specialty} বিশেষজ্ঞ। ${doctor.degree.join(', ')}। Vytanexa-এ বিস্তারিত দেখুন ও যোগাযোগ করুন।`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: doctor.photo_url ? [doctor.photo_url] : undefined,
      type: 'profile',
    },
  };
}

export default async function DoctorProfilePage({ params }: { params: { slug: string } }) {
  const doctor = await loadDoctor(params.slug);
  if (!doctor) notFound();

  const supabase = createClient();
  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, reviewer_name, rating, review_text, admin_reply, created_at')
    .eq('entity_type', 'doctor')
    .eq('entity_id', doctor.id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(20);

  const name = getLocalizedField(doctor.name_translations);
  const pageUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/doctors/${doctor.slug}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Physician',
    name,
    image: doctor.photo_url ?? undefined,
    ...(doctor.rating_count > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: String(doctor.rating_avg),
        reviewCount: String(doctor.rating_count),
      },
    }),
  };

  return (
    <>
      {/* eslint-disable-next-line react/no-danger -- static JSON-LD we constructed ourselves, not user input */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DoctorProfileClient doctor={doctor} reviews={reviews ?? []} pageUrl={pageUrl} />
    </>
  );
}
