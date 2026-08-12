import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@vytanexa/database';

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
 * `locationId` (optional) scopes to a district via `location_id`
 * equality — added after S12 uncovered that the Location Chip +
 * Zustand store this depends on already existed in the app (see
 * TODO.md's S12 correction note). Omitting it returns results
 * nationally, same as before.
 */
export async function getBloodBanks(supabase: SupabaseClient<Database>, locationId?: string) {
  let hospitalQuery = supabase
    .from('hospitals')
    .select(
      'id, slug, name_translations, address_line, phone, whatsapp_number, operating_hours, has_emergency_dept'
    )
    .eq('verification_status', 'verified')
    .contains('facility_tags', ['blood_bank']);
  if (locationId) hospitalQuery = hospitalQuery.eq('location_id', locationId);

  const { data: hospitals, error: hospitalError } = await hospitalQuery.order('is_featured', {
    ascending: false,
  });

  if (hospitalError) {
    console.error('getBloodBanks failed:', hospitalError.message);
    return [];
  }
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
 * Donor list — VYTANEXA-BLUEPRINT.md § S11 "Donor Registration
 * (Opt-in Directory)": queries the `public_blood_donors` VIEW, which
 * omits `phone` at the schema level (DATABASE-SCHEMA.md § 3.6) —
 * never the raw `blood_donors` table, and RLS blocks that table
 * entirely for the anon key regardless (`blood_donors_service_only`).
 *
 * `locationId` (optional) scopes to a district, same rationale as
 * `getBloodBanks`'s equivalent param above.
 */
export async function getBloodDonors(
  supabase: SupabaseClient<Database>,
  bloodGroup?: string,
  locationId?: string
) {
  let query = supabase
    .from('public_blood_donors')
    .select('id, name, blood_group, location_id, last_donated_at')
    .order('id', { ascending: false })
    .limit(30);

  if (bloodGroup) query = query.eq('blood_group', bloodGroup);
  if (locationId) query = query.eq('location_id', locationId);

  const { data, error } = await query;
  if (error) {
    console.error('getBloodDonors failed:', error.message);
    return [];
  }
  // public_blood_donors is a VIEW, so Postgres doesn't carry the
  // underlying table's NOT NULL constraints into its generated types
  // (every column types as nullable) even though the view's WHERE
  // clause guarantees these are always populated in practice. Filter
  // defensively rather than asserting.
  return (data ?? []).filter(
    (d): d is { id: string; name: string; blood_group: string; location_id: string; last_donated_at: string | null } =>
      d.id !== null && d.name !== null && d.blood_group !== null && d.location_id !== null
  );
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
