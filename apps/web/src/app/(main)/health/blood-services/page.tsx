import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TopBarSection } from '@/components/layout/TopBar';
import { BloodServicesClient } from '@/components/blood-services/BloodServicesClient';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/current-user';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { getBloodBanks, getBloodDonors, getDistricts } from '@/lib/queries/blood-services';

export const metadata: Metadata = {
  title: 'ব্লাড সার্ভিস | Vytanexa',
  description: 'নিকটবর্তী ব্লাড ব্যাংক ও রক্তদাতাদের তালিকা দেখুন, অথবা রক্তদাতা হিসেবে নিবন্ধন করুন।',
};

/**
 * Blood Services — VYTANEXA-BLUEPRINT.md § S11 (`/health/blood-services`).
 * All three data sources fetched server-side on first load (nationally
 * — the server can't see the client's persisted Location Chip
 * selection). `BloodServicesClient` refetches via `/api/blood-services`
 * once a district is selected; blood group filtering stays client-side
 * against whichever set is currently loaded (small dataset, no need
 * for a round-trip per filter tap — same reasoning as S09's symptom
 * search).
 *
 * Bank directory stays fully public. The donor list + registration are
 * login-gated (post-launch decision, see BLOOD-SERVICE-PLAN.md) —
 * `public_blood_donors` now revokes anon SELECT at the DB level, so a
 * guest's query would just error; skip it entirely for guests instead
 * of hitting that error path on every page view.
 */
const VALID_GROUPS = new Set(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']);

export default async function BloodServicesPage({
  searchParams,
}: {
  searchParams: { group?: string };
}) {
  const supabase = createClient();
  if (!(await isFeatureEnabled(supabase, 'blood_services'))) {
    notFound();
  }
  const currentUser = await getCurrentUser(supabase);
  const [bloodBanks, donors, districts] = await Promise.all([
    getBloodBanks(supabase),
    currentUser ? getBloodDonors(supabase) : Promise.resolve([]),
    getDistricts(supabase),
  ]);
  // Phase C.5 — homepage blood-group pills link here with ?group=X.
  const initialGroup = VALID_GROUPS.has(searchParams.group ?? '') ? searchParams.group! : null;

  return (
    <>
      <TopBarSection title="ব্লাড সার্ভিস" />
      <BloodServicesClient
        bloodBanks={bloodBanks}
        donors={donors}
        districts={districts}
        initialGroup={initialGroup}
        isLoggedIn={!!currentUser}
      />
    </>
  );
}
