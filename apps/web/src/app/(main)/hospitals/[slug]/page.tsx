import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getHospitalBySlug, getHospitalServices } from '@/lib/queries/hospital-detail';
import { getLocalizedField } from '@/lib/i18n';
import { HospitalProfileClient } from '@/components/hospital-profile/HospitalProfileClient';

// ISR: revalidate hourly per S02 § 3.2, same caveat as S07's doctor
// detail page (cookies() usage inside createClient() means this ends
// up dynamically rendered per-request in practice).
export const revalidate = 3600;

async function loadHospital(slug: string) {
  const supabase = createClient();
  return getHospitalBySlug(supabase, slug);
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const hospital = await loadHospital(params.slug);
  if (!hospital) return { title: 'হাসপাতাল পাওয়া যায়নি | Vytanexa' };

  const name = getLocalizedField(hospital.name_translations);
  const description =
    getLocalizedField(hospital.description_translations) ||
    `${name} — Vytanexa-এ বিস্তারিত দেখুন, যোগাযোগ করুন ও দিকনির্দেশনা পান।`;

  return {
    title: `${name} | Vytanexa`,
    description,
    openGraph: {
      title: `${name} | Vytanexa`,
      description,
      images: hospital.cover_image_url ? [hospital.cover_image_url] : undefined,
      type: 'website',
    },
  };
}

export default async function HospitalProfilePage({ params }: { params: { slug: string } }) {
  const hospital = await loadHospital(params.slug);
  if (!hospital) notFound();

  const supabase = createClient();
  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, reviewer_name, rating, review_text, admin_reply, created_at')
    .eq('entity_type', 'hospital')
    .eq('entity_id', hospital.id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(20);

  const { matched, unmatchedKeys } = await getHospitalServices(supabase, hospital.services);

  const name = getLocalizedField(hospital.name_translations);
  const pageUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/hospitals/${hospital.slug}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Hospital',
    name,
    image: hospital.cover_image_url ?? undefined,
    address: hospital.address_line,
    telephone: hospital.phone,
    ...(hospital.latitude &&
      hospital.longitude && {
        geo: {
          '@type': 'GeoCoordinates',
          latitude: hospital.latitude,
          longitude: hospital.longitude,
        },
      }),
    ...(hospital.facility_tags.length > 0 && {
      amenityFeature: hospital.facility_tags.map((tag) => ({
        '@type': 'LocationFeatureSpecification',
        name: tag,
        value: true,
      })),
    }),
    ...(hospital.rating_count > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: String(hospital.rating_avg),
        reviewCount: String(hospital.rating_count),
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
      <HospitalProfileClient
        hospital={hospital}
        reviews={reviews ?? []}
        matchedServices={matched}
        unmatchedServiceKeys={unmatchedKeys}
        pageUrl={pageUrl}
      />
    </>
  );
}
