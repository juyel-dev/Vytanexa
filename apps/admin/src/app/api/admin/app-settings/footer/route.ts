import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';

const linkSchema = z.object({ label: z.string().trim().min(1), href: z.string().trim().min(1) });
const schema = z.object({
  footer_links: z.array(linkSchema).max(20).optional(),
  social_links: z
    .object({
      facebook: z.string().trim().optional().default(''),
      instagram: z.string().trim().optional().default(''),
      twitter: z.string().trim().optional().default(''),
      youtube: z.string().trim().optional().default(''),
    })
    .optional(),
  contact_phone: z.string().trim().nullable().optional(),
  contact_email: z.string().trim().nullable().optional(),
  contact_whatsapp: z.string().trim().nullable().optional(),
  tagline: z.string().trim().optional().default(''),
});

/**
 * POST /api/admin/app-settings/footer — super_admin only.
 * Maps to app_settings footer_links / social_links / contact_* + seo_defaults.tagline.
 */
export async function POST(request: Request) {
  const session = await requireRole('super_admin');
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'অবৈধ ডেটা' }, { status: 400 });

  const supabase = createServiceRoleClient();
  const { data: before } = await supabase.from('app_settings').select('footer_links, social_links, contact_phone, contact_email, contact_whatsapp, seo_defaults').eq('id', 1).maybeSingle();

  const updates: Record<string, unknown> = { updated_by: session.id };
  if (parsed.data.footer_links !== undefined) updates.footer_links = parsed.data.footer_links as never;
  if (parsed.data.social_links !== undefined) updates.social_links = parsed.data.social_links as never;
  if (parsed.data.contact_phone !== undefined) updates.contact_phone = parsed.data.contact_phone || null;
  if (parsed.data.contact_email !== undefined) updates.contact_email = parsed.data.contact_email || null;
  if (parsed.data.contact_whatsapp !== undefined) updates.contact_whatsapp = parsed.data.contact_whatsapp || null;
  // tagline stored in seo_defaults.tagline (lightweight, no migration)
  if (parsed.data.tagline !== undefined) {
    const prevSeo = ((before as { seo_defaults?: Record<string, unknown> } | null)?.seo_defaults) ?? {};
    updates.seo_defaults = { ...prevSeo, tagline: parsed.data.tagline } as never;
  }

  const { error } = await supabase.from('app_settings').update(updates as never).eq('id', 1);
  if (error) return NextResponse.json({ error: 'সংরক্ষণ করা যায়নি: ' + error.message }, { status: 500 });

  const { data: after } = await supabase.from('app_settings').select('footer_links, social_links, contact_phone, contact_email, contact_whatsapp, seo_defaults').eq('id', 1).maybeSingle();
  await writeAudit(supabase, session.id, 'update', 'app_settings', '1', { before, after });

  return NextResponse.json({ ok: true, settings: after });
}
