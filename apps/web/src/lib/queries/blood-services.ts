import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@vytanexa/database';
import { getLocationSubtreeIds } from './location-subtree';

/**
 * Blood Banks — VYTANEXA-BLUEPRINT.md § S11. A "blood bank" is a
 * verified hospital tagged `facility_tags @> {'blood_bank'}` (same
 * tag already used elsewhere, e.g. `HospitalCard`'s FACILITY_LABELS)
 * — there's no separate blood-bank entity table, consistent with the
 * schema's "hospitals is the one physical-facility table" design.
 *
 * Stock inventory is fetched separately and merged in, filtered to
 * the 48-hour freshness window at query time (DATABASE-SCHEMA.md §
 * 3.4: "expiry is computed, not maintained" — no cron needed). A
 * hospital with no fresh inventory rows just renders with no stock
 * indicators at all, per spec: "stale data hidden entirely rather
 * than shown wrong."
 *
 * `locationId` (optional) scopes to a district + all its descendants
 * (see `location-subtree.ts`) — blood banks are hospitals tagged at
 * their lowest level, so exact-match would miss most of them.
 * Omitting it returns results nationally, same as before.
 */
export async function getBloodBanks(supabase: SupabaseClient<Database>, locationId?: string) {
  let hospitalQuery = supabase
    .from('hospitals')
    .select(
      'id, slug, name_translations, address_line, phone, whatsapp_number, operating_hours, has_emergency_dept'
    )
    .eq('verification_status', 'verified')
    .contains('facility_tags', ['blood_bank']);
  if (locationId) {
    hospitalQuery = hospitalQuery.in(
      'location_id',
      await getLocationSubtreeIds(supabase, locationId)
    );
  }

  const { data: hospitals, error: hospitalError } = await hospitalQuery.order('is_featured', {
    ascending: false,
  });

  // Throw (don't return []): "no blood banks" during a DB outage is the
  // worst possible message for someone in a blood emergency. Callers
  // decide how to degrade (page/API show an error + retry).
  if (hospitalError) throw new Error(`getBloodBanks failed: ${hospitalError.message}`);
  if (!hospitals || hospitals.length === 0) return [];

  const hospitalIds = hospitals.map((h) => h.id);
  const freshCutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: inventory, error: inventoryError } = await supabase
    .from('blood_bank_inventory')
    .select('hospital_id, blood_group, stock_level, reported_at')
    .in('hospital_id', hospitalIds)
    .gte('reported_at', freshCutoff);

  if (inventoryError) {
    console.error('getBloodBanks: inventory lookup failed:', inventoryError.message);
  }

  return hospitals.map((h) => ({
    ...h,
    stock: (inventory ?? []).filter((i) => i.hospital_id === h.id),
  }));
}

export type BloodBank = Awaited<ReturnType<typeof getBloodBanks>>[number];

/**
 * Fresh (48h window) blood-stock rows for one hospital — same
 * freshness rule as `getBloodBanks` above, factored out so the
 * hospital detail page (S08) can show stock for hospitals tagged
 * `blood_bank` without duplicating the cutoff logic. Added for
 * TODO.md Phase C.3 (blood bank detail page) — a blood bank IS a
 * hospital, so this reuses `/hospitals/[slug]` rather than a new
 * route (see this file's top-of-file note on why there's no separate
 * blood-bank entity).
 */
export async function getFreshBloodStock(supabase: SupabaseClient<Database>, hospitalId: string) {
  const freshCutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('blood_bank_inventory')
    .select('blood_group, stock_level, reported_at')
    .eq('hospital_id', hospitalId)
    .gte('reported_at', freshCutoff);

  if (error) {
    console.error('getFreshBloodStock failed:', error.message);
    return [];
  }
  return data ?? [];
}

export type BloodStockRow = Awaited<ReturnType<typeof getFreshBloodStock>>[number];

/**
 * Donor list — VYTANEXA-BLUEPRINT.md § S11 "Donor Registration
 * (Opt-in Directory)". Reads via the `list_blood_donors()` RPC (migration
 * 0019): SECURITY DEFINER, executable by signed-in users only, returns
 * name + blood group + district + last-donated — never `phone` — newest
 * registrations first.
 *
 * Why an RPC and not the `public_blood_donors` view: that view is
 * `security_invoker`, and `blood_donors` blocks every direct SELECT
 * (`blood_donors_service_only`, `USING (false)`), so the view returned
 * ZERO rows to every signed-in user — the donor list was always empty.
 *
 * `locationId` (optional) scopes to a district via EXACT match —
 * deliberately NOT subtree-expanded: donor registration only allows
 * district-level selection, so donor rows are always district-tagged.
 */
export async function getBloodDonors(
  supabase: SupabaseClient<Database>,
  bloodGroup?: string,
  locationId?: string
) {
  const { data, error } = await supabase.rpc('list_blood_donors', {
    p_blood_group: bloodGroup,
    p_location_id: locationId,
    p_limit: 30,
  });
  if (error) throw new Error(`getBloodDonors failed: ${error.message}`);
  return data ?? [];
}

/** Districts for the donor registration form's required location field. */
export async function getDistricts(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase
    .from('locations')
    .select('id, slug, name_translations')
    .eq('type', 'district')
    .eq('is_active', true)
    .order('display_order');

  if (error) {
    console.error('getDistricts failed:', error.message);
    return [];
  }
  return data ?? [];
}
