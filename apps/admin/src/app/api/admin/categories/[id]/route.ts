import 'server-only';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';
import { categoryUpdateSchema } from '@/lib/validations/categories';
import { slugify } from '@/lib/location-utils';

/**
 * PATCH /api/admin/categories/[id] — update
 * DELETE /api/admin/categories/[id] — soft-delete (blocked if doctors reference it)
 */

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await requireRole('admin');
  const parsed = categoryUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'অবৈধ ডেটা' }, { status: 400 });
  }
  const body = parsed.data;
  const supabase = createServiceRoleClient();
  const id = params.id;

  const { data: existing } = await supabase.from('categories').select('*').eq('id', id).is('deleted_at', null).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'বিভাগ খুঁজে পাওয়া যায়নি' }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (body.name_translations !== undefined) updates.name_translations = body.name_translations;
  if (body.icon_key !== undefined) updates.icon_key = body.icon_key ?? null;
  if (body.search_keywords !== undefined) updates.search_keywords = body.search_keywords.map((k) => k.trim()).filter(Boolean);
  if (body.display_order !== undefined) updates.display_order = body.display_order;
  if (body.is_visible_home !== undefined) updates.is_visible_home = body.is_visible_home;
  if (body.is_active !== undefined) updates.is_active = body.is_active;

  if (body.slug !== undefined) {
    const raw = (body.slug ?? '').trim();
    const slug = raw ? slugify(raw) : slugify((existing.name_translations as { bn?: string })?.bn ?? existing.slug);
    if (!slug) return NextResponse.json({ error: 'একটি স্লাগ দরকার' }, { status: 400 });
    if (slug !== existing.slug) {
      const { data: clash } = await supabase.from('categories').select('id').eq('slug', slug).is('deleted_at', null).maybeSingle();
      if (clash) return NextResponse.json({ error: `স্লাগ "${slug}" আগে থেকেই আছে` }, { status: 409 });
    }
    updates.slug = slug;
  }

  if (Object.keys(updates).length === 0) return NextResponse.json({ category: existing });

  const { data: updated, error } = await supabase.from('categories').update(updates as never).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: 'সংরক্ষণ করা যায়নি: ' + error.message }, { status: 500 });

  await writeAudit(supabase, session.id, 'update', 'category', id, { before: existing, after: updated });

  return NextResponse.json({ category: updated });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await requireRole('admin');
  const supabase = createServiceRoleClient();
  const id = params.id;

  const { data: existing } = await supabase.from('categories').select('id, slug').eq('id', id).is('deleted_at', null).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'বিভাগ খুঁজে পাওয়া যায়নি' }, { status: 404 });

  const { count } = await supabase.from('doctors').select('id', { count: 'exact', head: true }).eq('category_id', id).is('deleted_at', null);
  if (count) {
    return NextResponse.json(
      { error: `এই বিভাগে এখনো ${count} জন ডাক্তার যুক্ত আছে। প্রথমে তাদের অন্য বিভাগে সরান।` },
      { status: 409 }
    );
  }

  const { error } = await supabase.from('categories').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) return NextResponse.json({ error: 'মুছে ফেলা যায়নি: ' + error.message }, { status: 500 });

  await writeAudit(supabase, session.id, 'delete', 'category', id, { before: existing });

  return NextResponse.json({ ok: true });
}
