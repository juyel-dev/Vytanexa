import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { queryDoctorList, type DoctorListParams } from '@/lib/queries/doctor-list';

/**
 * GET /api/doctors — VYTANEXA-BLUEPRINT.md § S06 "INFINITE SCROLL &
 * PAGINATION". Called by the client-side infinite scroll continuation
 * once the SSR-rendered first page has been scrolled past. Shares its
 * query logic with the SSR page via `queryDoctorList`.
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const params: DoctorListParams = {
    specialty: sp.get('specialty') ?? undefined,
    feeMin: sp.get('feeMin') ? Number(sp.get('feeMin')) : undefined,
    feeMax: sp.get('feeMax') ? Number(sp.get('feeMax')) : undefined,
    rating: sp.get('rating') ?? undefined,
    languages: sp.get('languages') ?? undefined,
    sort: (sp.get('sort') as DoctorListParams['sort']) ?? undefined,
    page: sp.get('page') ? Number(sp.get('page')) : 0,
  };

  const supabase = createClient();
  const { data, error, count, pageSize } = await queryDoctorList(supabase, params);

  if (error) {
    console.error('doctors list query failed:', error.message);
    return NextResponse.json({ doctors: [], count: 0, hasMore: false }, { status: 500 });
  }

  const hasMore = ((params.page ?? 0) + 1) * pageSize < count;
  return NextResponse.json({ doctors: data, count, hasMore });
}
