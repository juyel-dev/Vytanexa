import 'server-only';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';
import { customPageUpdateSchema } from '@/lib/validations/custom-pages';
import { slugify } from '@/lib/location-utils';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await requireRole('admin');
  const parsed = customPageUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'অবৈধ ডেটা' }, { status: 400 });
  const body = parsed.data;
  const supabase = createServiceRoleClient();
  const id = params.id;

  const { data: existing } = await supabase.from('custom_pages').select('*').eq('id', id).is('deleted_at', null).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'পেজ পাওয়া যায়নি' }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title.trim();
  if (body.blocks !== undefined) updates.blocks = body.blocks as never;
  if (body.show_in_menu !== undefined) updates.show_in_menu = body.show_in_menu;
  if (body.menu_icon !== undefined) updates.menu_icon = body.menu_icon ?? null;
  if (body.menu_order !== undefined) updates.menu_order = body.menu_order;
  if (body.is_published !== undefined) updates.is_published = body.is_published;
  if (body.meta_title !== undefined) updates.meta_title = body.meta_title || null;
  if (body.meta_description !== undefined) updates.meta_description = body.meta_description || null;
  if (body.og_image !== undefined) updates.og_image = body.og_image || null;

  if (body.slug !== undefined) {
    const raw = (body.slug ?? '').trim();
    const slug = raw ? slugify(raw) : slugify((existing as { title: string }).title) || (existing as { slug: string }).slug;
    if (!slug) return NextResponse.json({ error: 'একটি স্লাগ দরকার' }, { status: 400 });
    if (slug !== (existing as { slug: string }).slug) {
      const { data: clash } = await supabase.from('custom_pages').select('id').eq('slug', slug).is('deleted_at', null).maybeSingle();
      if (clash) return NextResponse.json({ error: `স্লাগ "${slug}" আগে থেকেই আছে` }, { status: 409 });
    }
    updates.slug = slug;
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from('custom_pages').update(updates as never).eq('id', id);
    if (error) return NextResponse.json({ error: 'আপডেট করা যায়নি: ' + error.message }, { status: 500 });
  }

  const { data: updated } = await supabase.from('custom_pages').select('*').eq('id', id).is('deleted_at', null).maybeSingle();
  await writeAudit(supabase, session.id, 'update', 'custom_pages', id, { before: existing, after: updated });
  return NextResponse.json({ page: updated });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await requireRole('admin');
  const supabase = createServiceRoleClient();
  const id = params.id;
  const { data: existing } = await supabase.from('custom_pages').select('id, title').eq('id', id).is('deleted_at', null).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'পেজ পাওয়া যায়নি' }, { status: 404 });

  // check submissions
  const { count } = await supabase.from('page_submissions').select('id', { count: 'exact', head: true }).eq('page_id', id);
  // still soft-delete, but client shows warning if count>0
  const { error } = await supabase.from('custom_pages').update({ deleted_at: new Date().toISOString() } as never).eq('id', id);
  if (error) return NextResponse.json({ error: 'মুছে ফেলা যায়নি: ' + error.message }, { status: 500 });

  await writeAudit(supabase, session.id, 'delete', 'custom_pages', id, { before: existing });
  return NextResponse.json({ ok: true, submissions: count ?? 0 });
}
