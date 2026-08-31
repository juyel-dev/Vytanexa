import 'server-only';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';
import { articleCreateSchema } from '@/lib/validations/articles';
import { slugify } from '@/lib/location-utils';
import { sanitizeContentHtml } from '@/lib/sanitize-html';

export async function POST(request: Request) {
  const session = await requireRole('admin');
  // editor can create (draft only) — checked later for publish
  const parsed = articleCreateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'অবৈধ ডেটা' }, { status: 400 });
  const body = parsed.data;
  const supabase = createServiceRoleClient();

  // editor cannot publish
  if (body.is_published && session.role === 'editor') {
    return NextResponse.json({ error: 'প্রকাশ করার অনুমতি নেই, admin-কে জানান' }, { status: 403 });
  }

  if (body.author_doctor_id) {
    const { data: doc } = await supabase.from('doctors').select('id').eq('id', body.author_doctor_id).is('deleted_at', null).maybeSingle();
    if (!doc) return NextResponse.json({ error: 'ডাক্তার পাওয়া যায়নি' }, { status: 400 });
  }

  const rawSlug = (body.slug ?? '').trim();
  const slug = rawSlug ? slugify(rawSlug) : slugify(body.title_translations.bn);
  if (!slug) return NextResponse.json({ error: 'একটি স্লাগ দরকার' }, { status: 400 });
  const { data: clash } = await supabase.from('articles').select('id').eq('slug', slug).is('deleted_at', null).maybeSingle();
  if (clash) return NextResponse.json({ error: `স্লাগ "${slug}" আগে থেকেই আছে` }, { status: 409 });

  // auto read time if not provided: words/200
  const bodyHtml = sanitizeContentHtml(body.body_html ?? '');
  let readTime = body.read_time_minutes ?? null;
  if (readTime == null) {
    const words = bodyHtml.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
    readTime = Math.max(1, Math.ceil(words / 200));
  }

  const { data: created, error } = await supabase
    .from('articles')
    .insert({
      slug,
      title_translations: body.title_translations,
      cover_image_url: body.cover_image_url || null,
      category: body.category || null,
      body_html: bodyHtml,
      author_name: body.author_name || null,
      author_doctor_id: body.author_doctor_id ?? null,
      tags: [...new Set((body.tags ?? []).map((s: string) => s.trim()).filter(Boolean))],
      read_time_minutes: readTime,
      is_published: body.is_published ?? false,
      published_at: body.is_published ? new Date().toISOString() : null,
      meta_title: body.meta_title || null,
      meta_description: body.meta_description || null,
    } as never)
    .select()
    .single();

  if (error || !created) return NextResponse.json({ error: 'আর্টিকেল সংরক্ষণ করা যায়নি: ' + (error?.message ?? '') }, { status: 500 });
  await writeAudit(supabase, session.id, 'create', 'article', (created as { id: string }).id, { after: created });
  return NextResponse.json({ article: created }, { status: 201 });
}
