import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';

const schema = z.object({
  features: z.record(z.boolean()),
});

/**
 * POST /api/admin/app-settings/flags — toggle feature flags (A08).
 * Gate: super_admin. Merges into app_settings.features JSONB (existing keys preserved unless overwritten).
 */
export async function POST(request: Request) {
  const session = await requireRole('super_admin');
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'অবৈধ ডেটা' }, { status: 400 });

  const supabase = createServiceRoleClient();
  const { data: before } = await supabase.from('app_settings').select('features').eq('id', 1).maybeSingle();
  const prev = ((before as { features: Record<string, boolean> } | null)?.features) ?? {};
  const next = { ...prev, ...parsed.data.features };

  const { error } = await supabase.from('app_settings').update({ features: next as never, updated_by: session.id } as never).eq('id', 1);
  if (error) return NextResponse.json({ error: 'সংরক্ষণ করা যায়নি: ' + error.message }, { status: 500 });

  await writeAudit(supabase, session.id, 'update', 'app_settings', '1', { before: prev, after: next });
  return NextResponse.json({ ok: true, features: next });
}
