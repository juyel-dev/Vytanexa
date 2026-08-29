import 'server-only';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';
import { customPageCreateSchema } from '@/lib/validations/custom-pages';
import { slugify } from '@/lib/location-utils';

/**
 * POST /api/admin/custom-pages — create custom page (A09). Auto-slug from title, unique.
 * Gate: admin/super_admin (A09 is not god-mode, but content CRUD).
 */
export async function POST(request: Request) {
  const session = await requireRole('admin');
  const parsed = customPageCreateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'অবৈধ ডেটা' }, { status: 400 });
  const body = parsed.data;
  const supabase = createServiceRoleClient();

  const rawSlug = (body.slug ?? '').trim();
  const slug = rawSlug ? slugify(rawSlug) : slugify(body.title);
  if (!slug) return NextResponse.json({ error: 'একটি স্লাগ দরকার' }, { status: 400 });
  const { data: clash } = await supabase.from('custom_pages').select('id').eq('slug', slug).is('deleted_at', null).maybeSingle();
  if (clash) return NextResponse.json({ error: `স্লাগ "${slug}" আগে থেকেই আছে` }, { status: 409 });

  const { data: created, error } = await supabase
    .from('custom_pages')
    .insert({
      title: body.title.trim(),
      slug,
      blocks: (body.blocks ?? []) as never,
      show_in_menu: body.show_in_menu ?? false,
      menu_icon: body.menu_icon ?? null,
      menu_order: body.menu_order ?? 0,
      is_published: body.is_published ?? false,
      meta_title: body.meta_title || null,
      meta_description: body.meta_description || null,
      og_image: body.og_image || null,
      created_by: session.id,
    } as never)
    .select()
    .single();

  if (error || !created) return NextResponse.json({ error: 'পেজ তৈরি করা যায়নি: ' + (error?.message ?? '') }, { status: 500 });

  await writeAudit(supabase, session.id, 'create', 'custom_pages', (created as { id: string }).id, { after: created });
  return NextResponse.json({ page: created }, { status: 201 });
}
