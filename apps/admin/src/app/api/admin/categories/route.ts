import 'server-only';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';
import { categoryCreateSchema } from '@/lib/validations/categories';
import { slugify } from '@/lib/location-utils';

/**
 * POST /api/admin/categories — create a category (A04).
 * Gate: admin/super_admin.
 * Slug auto-generated from bn/en name if omitted; unique.
 */
export async function POST(request: Request) {
  const session = await requireRole('admin');
  const parsed = categoryCreateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'অবৈধ ডেটা' }, { status: 400 });
  }
  const body = parsed.data;
  const supabase = createServiceRoleClient();

  const rawSlug = body.slug?.trim() ?? '';
  const slug = rawSlug ? slugify(rawSlug) : slugify(body.name_translations.bn || body.name_translations.en || '');
  if (!slug) return NextResponse.json({ error: 'একটি স্লাগ দরকার' }, { status: 400 });

  const { data: clash } = await supabase.from('categories').select('id').eq('slug', slug).is('deleted_at', null).maybeSingle();
  if (clash) return NextResponse.json({ error: `স্লাগ "${slug}" আগে থেকেই আছে` }, { status: 409 });

  // normalize keywords: split already done client-side, trim + dedup + lower? keep as-is but trim
  const keywords = (body.search_keywords ?? []).map((k) => k.trim()).filter(Boolean);

  const { data: created, error } = await supabase
    .from('categories')
    .insert({
      name_translations: body.name_translations,
      slug,
      icon_key: body.icon_key ?? null,
      search_keywords: keywords,
      display_order: body.display_order ?? 0,
      is_visible_home: body.is_visible_home ?? true,
      is_active: body.is_active ?? true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'সংরক্ষণ করা যায়নি: ' + error.message }, { status: 500 });

  await writeAudit(supabase, session.id, 'create', 'category', created.id, { after: created });

  return NextResponse.json({ category: created }, { status: 201 });
}
