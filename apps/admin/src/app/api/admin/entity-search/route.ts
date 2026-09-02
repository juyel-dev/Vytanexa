import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/entity-search?type=doctor|hospital&q=... — TODO.md
 * Phase 10.8. SubscriptionsManager's "assign subscription" form had a
 * raw "এন্টিটি ID (UUID)" text field with no way to look one up —
 * an admin had to already know or go copy a doctor/hospital's UUID
 * from another tab. This backs a small autocomplete instead.
 */
export async function GET(request: NextRequest) {
  await requireRole('admin');
  const type = request.nextUrl.searchParams.get('type');
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (type !== 'doctor' && type !== 'hospital') {
    return NextResponse.json({ error: 'type must be doctor or hospital' }, { status: 400 });
  }
  if (q.length < 2) return NextResponse.json({ results: [] });

  const supabase = createServiceRoleClient();
  const table = type === 'doctor' ? 'doctors' : 'hospitals';
  const { data } = await supabase
    .from(table)
    .select('id, name_translations, slug')
    .or(`name_translations->>bn.ilike.%${q}%,name_translations->>en.ilike.%${q}%`)
    .limit(8);

  const results = (data ?? []).map((r) => {
    const t = (r as { name_translations: { bn?: string; en?: string } | null }).name_translations;
    return { id: (r as { id: string }).id, name: t?.bn || t?.en || (r as { slug: string }).slug };
  });

  return NextResponse.json({ results });
}
