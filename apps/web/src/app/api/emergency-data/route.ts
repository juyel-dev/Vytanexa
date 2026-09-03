import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBloodBanks } from '@/lib/queries/blood-services';
import { getLocationSubtreeIds } from '@/lib/queries/location-subtree';

/**
 * GET /api/emergency-data?district=... — VYTANEXA-BLUEPRINT.md § S12.
 *
 * Exists specifically to keep `EmergencyDataSections` off the browser
 * Supabase client (`lib/supabase/client.ts`), the same way `/api/
 * test-search` (S10) and `/api/search` (S05) keep their client
 * components lean. An earlier version of this page called
 * `createClient()` from the browser directly (matching `EmergencyFAB`'s
 * existing pattern) and measured 171KB First Load JS — the Supabase
 * browser client bundle (~70KB: full supabase-js + auth-js + realtime-js)
 * is fine to pay for *once*, shared across every page via `EmergencyFAB`
 * living in the root (main) layout, but paying it a *second* time for
 * a route-specific component pushed this page over S22's 150KB budget
 * in a way that didn't resolve even with `next/dynamic({ssr:false})` —
 * a plain Route Handler sidesteps the problem entirely rather than
 * fighting the bundler.
 */
export async function GET(request: NextRequest) {
  const districtId = request.nextUrl.searchParams.get('district') || undefined;
  const supabase = createClient();

  let hospitalQuery = supabase
    .from('hospitals')
    .select('id, slug, name_translations, phone, address_line')
    .eq('verification_status', 'verified')
    .eq('has_emergency_dept', true)
    .order('is_featured', { ascending: false })
    .limit(10);
  // Hierarchy-aware: a district also matches facilities tagged at
  // sub_district/ward level (see location-subtree.ts). Blood banks stay
  // national on purpose — in an emergency, hiding a nearby bank because
  // of a district boundary is worse than showing one extra row.
  const districtIds = districtId
    ? await getLocationSubtreeIds(supabase, districtId)
    : null;
  if (districtIds) hospitalQuery = hospitalQuery.in('location_id', districtIds);

  let ambulanceQuery = supabase
    .from('ambulance_services')
    .select('id, name_translations, phone')
    .eq('verification_status', 'verified')
    .eq('is_active', true)
    .limit(5);
  if (districtIds) ambulanceQuery = ambulanceQuery.in('location_id', districtIds);

  const [hospitalRes, ambulanceRes, bloodBanks] = await Promise.all([
    hospitalQuery,
    ambulanceQuery,
    getBloodBanks(supabase),
  ]);

  if (hospitalRes.error) console.error('emergency-data: hospitals failed:', hospitalRes.error.message);
  if (ambulanceRes.error) console.error('emergency-data: ambulances failed:', ambulanceRes.error.message);

  return NextResponse.json({
    hospitals: hospitalRes.data ?? [],
    ambulances: ambulanceRes.data ?? [],
    bloodBanks,
  });
}
