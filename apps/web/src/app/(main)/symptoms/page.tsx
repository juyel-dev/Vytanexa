import type { Metadata } from 'next';
import { TopBarSection } from '@/components/layout/TopBar';
import { SymptomsListClient } from '@/components/symptoms/SymptomsListClient';
import { createClient } from '@/lib/supabase/server';
import { queryAllSymptoms } from '@/lib/queries/symptom-list';
import { getT } from '@vytanexa/i18n/server';

// SSG at build time, ISR revalidate 6hr per S09 spec ("symptom list
// is admin-managed, low churn"). Same cookies()-inside-createClient()
// caveat as other pages documented elsewhere in this app.
export const revalidate = 21600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT('symptoms');
  return {
    title: `${t('title')} | Vytanexa`,
    description: t('metaDescription'),
  };
}

export default async function SymptomsPage() {
  const supabase = createClient();
  const [symptoms, t] = await Promise.all([queryAllSymptoms(supabase), getT('symptoms')]);

  return (
    <>
      <TopBarSection title={t('title')} />
      <SymptomsListClient symptoms={symptoms} />
    </>
  );
}
