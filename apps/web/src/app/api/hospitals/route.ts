import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { queryHospitalList, type HospitalListParams } from '@/lib/queries/hospital-list';

/** GET /api/hospitals — infinite scroll continuation, mirrors /api/doctors (S06). */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const params: HospitalListParams = {
    type: sp.get('type') ?? undefined,
    emergencyOnly: sp.get('emergencyOnly') === 'true',
    page: sp.get('page') ? Number(sp.get('page')) : 0,
  };

  const supabase = createClient();
  const { data, error, count, pageSize } = await queryHospitalList(supabase, params);

  if (error) {
    console.error('hospitals list query failed:', error.message);
    return NextResponse.json({ hospitals: [], count: 0, hasMore: false }, { status: 500 });
  }

  const hasMore = ((params.page ?? 0) + 1) * pageSize < count;
  return NextResponse.json({ hospitals: data, count, hasMore });
}
