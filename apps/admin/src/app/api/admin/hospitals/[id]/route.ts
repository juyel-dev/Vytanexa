import 'server-only';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';
import { hospitalUpdateSchema } from '@/lib/validations/hospitals';
import { hospitalSlugBase } from '@/lib/hospital-utils';
import { slugify } from '@/lib/location-utils';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await requireRole('admin');
  const parsed = hospitalUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'অবৈধ ডেটা' }, { status: 400 });
  const body = parsed.data;
  const supabase = createServiceRoleClient();
  const id = params.id;

  const { data: existing } = await supabase.from('hospitals').select('*').eq('id', id).is('deleted_at', null).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'হাসপাতাল খুঁজে পাওয়া যায়নি' }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (body.name_translations !== undefined) updates.name_translations = body.name_translations;
  if (body.type !== undefined) updates.type = body.type;
  if (body.cover_image_url !== undefined) updates.cover_image_url = body.cover_image_url || null;
  if (body.gallery_images !== undefined) updates.gallery_images = body.gallery_images.map((s: string) => s.trim()).filter(Boolean).slice(0, 8);
  if (body.location_id !== undefined) {
    const { data: loc } = await supabase.from('locations').select('id').eq('id', body.location_id).is('deleted_at', null).maybeSingle();
    if (!loc) return NextResponse.json({ error: 'এলাকা খুঁজে পাওয়া যায়নি' }, { status: 400 });
    updates.location_id = body.location_id;
  }
  if (body.address_line !== undefined) updates.address_line = body.address_line.trim();
  if (body.latitude !== undefined) updates.latitude = body.latitude ?? null;
  if (body.longitude !== undefined) updates.longitude = body.longitude ?? null;
  if (body.map_link !== undefined) updates.map_link = body.map_link || null;
  if (body.phone !== undefined) updates.phone = body.phone.trim();
  if (body.whatsapp_number !== undefined) updates.whatsapp_number = body.whatsapp_number || null;
  if (body.description_translations !== undefined) updates.description_translations = body.description_translations;
  if (body.services !== undefined) updates.services = [...new Set(body.services.map((s: string) => s.trim()).filter(Boolean))];
  if (body.facility_tags !== undefined) updates.facility_tags = [...new Set(body.facility_tags.map((s: string) => s.trim()).filter(Boolean))];
  if (body.has_emergency_dept !== undefined) updates.has_emergency_dept = body.has_emergency_dept;
  if (body.operating_hours !== undefined) updates.operating_hours = body.operating_hours as never;
  if (body.verification_status !== undefined) updates.verification_status = body.verification_status;
  if (body.is_featured !== undefined) updates.is_featured = body.is_featured;
  if (body.is_trending !== undefined) updates.is_trending = body.is_trending;
  if (body.featured_priority !== undefined) updates.featured_priority = body.featured_priority;

  if (body.slug !== undefined) {
    const raw = (body.slug ?? '').trim();
    const nt = (existing as { name_translations: { bn?: string; en?: string } | null }).name_translations;
    const slug = raw ? slugify(raw) : hospitalSlugBase(nt?.bn ?? '', nt?.en ?? '') || (existing as { slug: string }).slug;
    if (!slug) return NextResponse.json({ error: 'একটি স্লাগ দরকার' }, { status: 400 });
    if (slug !== (existing as { slug: string }).slug) {
      const { data: clash } = await supabase.from('hospitals').select('id').eq('slug', slug).is('deleted_at', null).maybeSingle();
      if (clash) return NextResponse.json({ error: `স্লাগ "${slug}" আগে থেকেই আছে` }, { status: 409 });
    }
    updates.slug = slug;
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from('hospitals').update(updates as never).eq('id', id);
    if (error) return NextResponse.json({ error: 'আপডেট করা যায়নি: ' + error.message }, { status: 500 });
  }

  const { data: updated } = await supabase.from('hospitals').select('*').eq('id', id).is('deleted_at', null).maybeSingle();
  await writeAudit(supabase, session.id, 'update', 'hospital', id, { before: existing, after: updated });
  return NextResponse.json({ hospital: updated });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await requireRole('admin');
  const supabase = createServiceRoleClient();
  const id = params.id;
  const { data: existing } = await supabase.from('hospitals').select('id, slug').eq('id', id).is('deleted_at', null).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'হাসপাতাল খুঁজে পাওয়া যায়নি' }, { status: 404 });

  const { error } = await supabase.from('hospitals').update({ deleted_at: new Date().toISOString() } as never).eq('id', id);
  if (error) return NextResponse.json({ error: 'মুছে ফেলা যায়নি: ' + error.message }, { status: 500 });

  await writeAudit(supabase, session.id, 'delete', 'hospital', id, { before: existing });
  return NextResponse.json({ ok: true });
}
