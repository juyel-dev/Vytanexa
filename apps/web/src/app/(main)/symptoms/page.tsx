import type { Metadata } from 'next';
import { TopBarSection } from '@/components/layout/TopBar';
import { SymptomsListClient } from '@/components/symptoms/SymptomsListClient';
import { createClient } from '@/lib/supabase/server';
import { queryAllSymptoms } from '@/lib/queries/symptom-list';

// SSG at build time, ISR revalidate 6hr per S09 spec ("symptom list
// is admin-managed, low churn"). Same cookies()-inside-createClient()
// caveat as other pages documented elsewhere in this app.
export const revalidate = 21600;

export const metadata: Metadata = {
  title: 'উপসর্গ দেখে ডাক্তার খুঁজুন | Vytanexa',
  description: 'আপনার উপসর্গ বেছে নিন এবং উপযুক্ত বিশেষজ্ঞ ডাক্তার খুঁজে নিন।',
};

export default async function SymptomsPage() {
  const supabase = createClient();
  const symptoms = await queryAllSymptoms(supabase);

  return (
    <>
      <TopBarSection title="উপসর্গ দেখে ডাক্তার খুঁজুন" />
      <SymptomsListClient symptoms={symptoms} />
    </>
  );
}
