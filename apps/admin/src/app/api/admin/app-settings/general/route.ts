import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';

const schema = z.object({
  app_name: z.string().trim().min(1).optional(),
  default_locale: z.string().trim().min(2).max(5).optional(),
  supported_locales: z.array(z.string().trim().min(2).max(5)).min(1).optional(),
  seo_defaults: z
    .object({
      title: z.string().trim().optional().default(''),
      description: z.string().trim().optional().default(''),
      og_image: z.string().trim().optional().default(''),
    })
    .optional(),
});

/**
 * POST /api/admin/app-settings/general — super_admin only (A15 Settings).
 */
export async function POST(request: Request) {
  const session = await requireRole('super_admin');
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'অবৈধ ডেটা' }, { status: 400 });
  const supabase = createServiceRoleClient();
  const { data: before } = await supabase.from('app_settings').select('app_name, default_locale, supported_locales, seo_defaults').eq('id', 1).maybeSingle();

  const updates: Record<string, unknown> = { updated_by: session.id };
  if (parsed.data.app_name !== undefined) updates.app_name = parsed.data.app_name.trim();
  if (parsed.data.default_locale !== undefined) updates.default_locale = parsed.data.default_locale.trim();
  if (parsed.data.supported_locales !== undefined) updates.supported_locales = parsed.data.supported_locales;
  if (parsed.data.seo_defaults !== undefined) updates.seo_defaults = parsed.data.seo_defaults as never;

  const { error } = await supabase.from('app_settings').update(updates as never).eq('id', 1);
  if (error) return NextResponse.json({ error: 'সংরক্ষণ করা যায়নি: ' + error.message }, { status: 500 });

  const { data: after } = await supabase.from('app_settings').select('app_name, default_locale, supported_locales, seo_defaults').eq('id', 1).maybeSingle();
  await writeAudit(supabase, session.id, 'update', 'app_settings', '1', { before, after });
  return NextResponse.json({ ok: true, settings: after });
}
