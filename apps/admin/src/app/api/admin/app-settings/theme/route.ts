import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';

const hexRegex = /^#([0-9A-Fa-f]{6})$/;

const schema = z.object({
  theme_colors: z.record(z.string().regex(hexRegex, 'Hex রঙ #RRGGBB ফরম্যাটে দিন')).optional(),
  logo_url: z.string().trim().nullable().optional(),
  favicon_url: z.string().trim().nullable().optional(),
});

/**
 * POST /api/admin/app-settings/theme — publish theme colors + logo.
 * Gate: super_admin. theme_colors is a flat map like {brand_600:"#1756C8"}.
 */
export async function POST(request: Request) {
  const session = await requireRole('super_admin');
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'অবৈধ ডেটা' }, { status: 400 });

  const supabase = createServiceRoleClient();
  const { data: before } = await supabase.from('app_settings').select('theme_colors, logo_url, favicon_url').eq('id', 1).maybeSingle();

  const updates: Record<string, unknown> = { updated_by: session.id };
  if (parsed.data.theme_colors !== undefined) updates.theme_colors = parsed.data.theme_colors as never;
  if (parsed.data.logo_url !== undefined) updates.logo_url = parsed.data.logo_url || null;
  if (parsed.data.favicon_url !== undefined) updates.favicon_url = parsed.data.favicon_url || null;

  const { error } = await supabase.from('app_settings').update(updates as never).eq('id', 1);
  if (error) return NextResponse.json({ error: 'সংরক্ষণ করা যায়নি: ' + error.message }, { status: 500 });

  const { data: after } = await supabase.from('app_settings').select('theme_colors, logo_url, favicon_url').eq('id', 1).maybeSingle();
  await writeAudit(supabase, session.id, 'publish', 'app_settings', '1', { before, after });

  return NextResponse.json({ ok: true, theme: after });
}
