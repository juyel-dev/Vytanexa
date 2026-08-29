import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';

const sectionSchema = z.object({ id: z.string().min(1), visible: z.boolean(), order: z.number().int() });
const schema = z.object({ sections: z.array(sectionSchema).min(1).max(30) });

/**
 * POST /api/admin/app-settings/homepage — publish homepage section order/visibility.
 * Gate: super_admin only. Writes to app_settings.homepage_settings.sections,
 * audit-logs before/after, returns new row.
 */
export async function POST(request: Request) {
  const session = await requireRole('super_admin');
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'অবৈধ ডেটা' }, { status: 400 });

  const supabase = createServiceRoleClient();
  const { data: before } = await supabase.from('app_settings').select('homepage_settings').eq('id', 1).maybeSingle();

  const { error } = await supabase
    .from('app_settings')
    .update({ homepage_settings: { sections: parsed.data.sections } as never, updated_by: session.id } as never)
    .eq('id', 1);

  if (error) return NextResponse.json({ error: 'সংরক্ষণ করা যায়নি: ' + error.message }, { status: 500 });

  const { data: after } = await supabase.from('app_settings').select('homepage_settings').eq('id', 1).maybeSingle();
  await writeAudit(supabase, session.id, 'publish', 'app_settings', '1', { before: (before as { homepage_settings: unknown } | null)?.homepage_settings, after: (after as { homepage_settings: unknown } | null)?.homepage_settings });

  return NextResponse.json({ ok: true, homepage_settings: (after as { homepage_settings: unknown } | null)?.homepage_settings });
}
