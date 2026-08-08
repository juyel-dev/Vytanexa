import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getSymptomBySlug, getSpecialtyDoctorCounts } from '@/lib/queries/symptom-detail';
import { getLocalizedField } from '@/lib/i18n';
import { SymptomDetailClient } from '@/components/symptoms/SymptomDetailClient';

// SSG at build time, ISR revalidate 6hr per S09 spec.
export const revalidate = 21600;

async function loadSymptom(slug: string) {
  const supabase = createClient();
  return getSymptomBySlug(supabase, slug);
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const symptom = await loadSymptom(params.slug);
  if (!symptom) return { title: 'উপসর্গ পাওয়া যায়নি | Vytanexa' };

  const title = getLocalizedField(symptom.title_translations);
  const description =
    getLocalizedField(symptom.description_translations) ||
    `${title} সম্পর্কে জানুন এবং উপযুক্ত বিশেষজ্ঞ ডাক্তার খুঁজুন — Vytanexa।`;

  return {
    title: `${title} | Vytanexa`,
    description,
    openGraph: {
      title: `${title} | Vytanexa`,
      description,
      images: symptom.cover_image_url ? [symptom.cover_image_url] : undefined,
      type: 'article',
    },
  };
}

export default async function SymptomDetailPage({ params }: { params: { slug: string } }) {
  const symptom = await loadSymptom(params.slug);
  if (!symptom) notFound();

  const supabase = createClient();
  const categoryIds = symptom.symptom_categories
    .map((l) => l.categories?.id)
    .filter((id): id is string => Boolean(id));
  const doctorCounts = await getSpecialtyDoctorCounts(supabase, categoryIds);

  const title = getLocalizedField(symptom.title_translations);
  const description = getLocalizedField(symptom.description_translations);
  const pageUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/symptoms/${symptom.slug}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MedicalSymptom',
    name: title,
    ...(description && { description }),
  };

  return (
    <>
      {/* eslint-disable-next-line react/no-danger -- static JSON-LD we constructed ourselves, not user input */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SymptomDetailClient symptom={symptom} doctorCounts={doctorCounts} pageUrl={pageUrl} />
    </>
  );
}
