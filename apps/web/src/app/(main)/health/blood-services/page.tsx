import type { Metadata } from 'next';
import { TopBarSection } from '@/components/layout/TopBar';
import { BloodServicesClient } from '@/components/blood-services/BloodServicesClient';
import { createClient } from '@/lib/supabase/server';
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
 */
export default async function BloodServicesPage() {
  const supabase = createClient();
  const [bloodBanks, donors, districts] = await Promise.all([
    getBloodBanks(supabase),
    getBloodDonors(supabase),
    getDistricts(supabase),
  ]);

  return (
    <>
      <TopBarSection title="ব্লাড সার্ভিস" />
      <BloodServicesClient bloodBanks={bloodBanks} donors={donors} districts={districts} />
    </>
  );
}
