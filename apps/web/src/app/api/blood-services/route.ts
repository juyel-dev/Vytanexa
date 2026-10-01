import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBloodBanks, getBloodDonors } from '@/lib/queries/blood-services';

/**
 * GET /api/blood-services?district=...&bloodGroup=... —
 * VYTANEXA-BLUEPRINT.md § S11. Added after S12 uncovered that the
 * Location Chip + Zustand store already existed in the app (TODO.md's
 * S12 correction note) — this route lets `BloodServicesClient` refetch
 * when the person changes district, without a full page navigation.
 * The page's own SSR fetch still handles the initial paint (national,
 * since the server can't see the client's persisted district
 * selection); this route only serves subsequent client-side refetches.
 */
const VALID_GROUPS = new Set(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']);

export async function GET(request: NextRequest) {
  const district = request.nextUrl.searchParams.get('district') ?? undefined;
  const rawGroup = request.nextUrl.searchParams.get('bloodGroup') ?? undefined;
  const bloodGroup = rawGroup && VALID_GROUPS.has(rawGroup) ? rawGroup : undefined;

  try {
    const supabase = createClient();
    const [bloodBanks, donors] = await Promise.all([
      getBloodBanks(supabase, district),
      getBloodDonors(supabase, bloodGroup, district),
    ]);
    return NextResponse.json({ bloodBanks, donors });
  } catch (err) {
    console.error('blood-services route failed:', err);
    // 500, not an empty 200: the client keeps the list it already has
    // and offers a retry instead of showing "no blood banks".
    return NextResponse.json({ error: 'blood_services_failed' }, { status: 500 });
  }
}
