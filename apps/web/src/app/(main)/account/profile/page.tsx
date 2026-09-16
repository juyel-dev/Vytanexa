import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { TopBarSection } from '@/components/layout/TopBar';
import { ProfileEditClient } from '@/components/account/ProfileEditClient';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/current-user';
import { getDistricts } from '@/lib/queries/blood-services';
import { getT } from '@vytanexa/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT('account');
  return { title: `${t('editProfileTitle')} | Vytanexa` };
}

export default async function ProfileEditPage() {
  const supabase = createClient();
  const currentUser = await getCurrentUser(supabase);
  if (!currentUser) redirect('/auth/login?returnUrl=/account/profile');

  const t = await getT('account');
  const districts = await getDistricts(supabase);

  return (
    <>
      <TopBarSection title={t('editProfileTitle')} backHref="/account" />
      <ProfileEditClient
        initialName={currentUser.profile.name}
        phone={currentUser.profile.phone}
        initialEmail={currentUser.profile.email}
        initialLocationId={currentUser.profile.default_location_id}
        districts={districts}
      />
    </>
  );
}
