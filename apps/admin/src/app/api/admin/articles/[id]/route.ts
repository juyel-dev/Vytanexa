import 'server-only';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';
import { articleUpdateSchema } from '@/lib/validations/articles';
import { slugify } from '@/lib/location-utils';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await requireRole('admin');
  const parsed = articleUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'অবৈধ ডেটা' }, { status: 400 });
  const body = parsed.data;
  const supabase = createServiceRoleClient();
  const id = params.id;

  const { data: existing } = await supabase.from('articles').select('*').eq('id', id).is('deleted_at', null).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'আর্টিকেল পাওয়া যায়নি' }, { status: 404 });

  if (body.is_published && session.role === 'editor') {
    return NextResponse.json({ error: 'প্রকাশ করার অনুমতি নেই, admin-কে জানান' }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  if (body.title_translations !== undefined) updates.title_translations = body.title_translations;
  if (body.cover_image_url !== undefined) updates.cover_image_url = body.cover_image_url || null;
  if (body.category !== undefined) updates.category = body.category || null;
  if (body.body_html !== undefined) {
    updates.body_html = body.body_html;
    // recalc read time if not explicitly provided
    if (body.read_time_minutes === undefined) {
      const words = (body.body_html ?? '').replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
      updates.read_time_minutes = Math.max(1, Math.ceil(words / 200));
    }
  }
  if (body.author_name !== undefined) updates.author_name = body.author_name || null;
  if (body.author_doctor_id !== undefined) {
    if (body.author_doctor_id) {
      const { data: doc } = await supabase.from('doctors').select('id').eq('id', body.author_doctor_id).is('deleted_at', null).maybeSingle();
      if (!doc) return NextResponse.json({ error: 'ডাক্তার পাওয়া যায়নি' }, { status: 400 });
    }
    updates.author_doctor_id = body.author_doctor_id ?? null;
  }
  if (body.tags !== undefined) updates.tags = [...new Set(body.tags.map((s: string) => s.trim()).filter(Boolean))];
  if (body.read_time_minutes !== undefined) updates.read_time_minutes = body.read_time_minutes ?? null;
  if (body.is_published !== undefined) {
    updates.is_published = body.is_published;
    updates.published_at = body.is_published ? new Date().toISOString() : null;
  }
  if (body.meta_title !== undefined) updates.meta_title = body.meta_title || null;
  if (body.meta_description !== undefined) updates.meta_description = body.meta_description || null;

  if (body.slug !== undefined) {
    const raw = (body.slug ?? '').trim();
    const slug = raw ? slugify(raw) : slugify((existing as { title_translations: { bn?: string } }).title_translations?.bn ?? (existing as { slug: string }).slug);
    if (!slug) return NextResponse.json({ error: 'একটি স্লাগ দরকার' }, { status: 400 });
    if (slug !== (existing as { slug: string }).slug) {
      const { data: clash } = await supabase.from('articles').select('id').eq('slug', slug).is('deleted_at', null).maybeSingle();
      if (clash) return NextResponse.json({ error: `স্লাগ "${slug}" আগে থেকেই আছে` }, { status: 409 });
    }
    updates.slug = slug;
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from('articles').update(updates as never).eq('id', id);
    if (error) return NextResponse.json({ error: 'আপডেট করা যায়নি: ' + error.message }, { status: 500 });
  }

  const { data: updated } = await supabase.from('articles').select('*').eq('id', id).is('deleted_at', null).maybeSingle();
  await writeAudit(supabase, session.id, 'update', 'article', id, { before: existing, after: updated });
  return NextResponse.json({ article: updated });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await requireRole('admin');
  const supabase = createServiceRoleClient();
  const id = params.id;
  const { data: existing } = await supabase.from('articles').select('id, view_count').eq('id', id).is('deleted_at', null).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'আর্টিকেল পাওয়া যায়নি' }, { status: 404 });
  const { error } = await supabase.from('articles').update({ deleted_at: new Date().toISOString() } as never).eq('id', id);
  if (error) return NextResponse.json({ error: 'মুছে ফেলা যায়নি: ' + error.message }, { status: 500 });
  await writeAudit(supabase, session.id, 'delete', 'article', id, { before: existing });
  return NextResponse.json({ ok: true, view_count: (existing as { view_count: number }).view_count });
}
