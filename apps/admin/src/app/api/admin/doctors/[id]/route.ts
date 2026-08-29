import 'server-only';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';
import { doctorUpdateSchema } from '@/lib/validations/doctors';
import { doctorSlugBase } from '@/lib/doctor-utils';
import { slugify } from '@/lib/location-utils';

/**
 * PATCH /api/admin/doctors/[id] — update doctor + replace chambers
 * DELETE /api/admin/doctors/[id] — soft-delete (sets deleted_at)
 *
 * Chambers: the payload's `chambers[]` REPLACES existing chambers
 * (deleted ones are soft-deleted, new ones inserted, existing ones
 * updated by id). This keeps the inline sub-editor simple — the client
 * always sends the full desired state.
 */

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await requireRole('admin');
  const parsed = doctorUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'অবৈধ ডেটা' }, { status: 400 });
  const body = parsed.data;
  const supabase = createServiceRoleClient();
  const id = params.id;

  const { data: existing } = await supabase.from('doctors').select('*').eq('id', id).is('deleted_at', null).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'ডাক্তার খুঁজে পাওয়া যায়নি' }, { status: 404 });

  // build updates for doctors table
  const updates: Record<string, unknown> = {};
  if (body.name_translations !== undefined) updates.name_translations = body.name_translations;
  if (body.photo_url !== undefined) updates.photo_url = body.photo_url || null;
  if (body.category_id !== undefined) {
    const { data: cat } = await supabase.from('categories').select('id').eq('id', body.category_id).is('deleted_at', null).maybeSingle();
    if (!cat) return NextResponse.json({ error: 'বিভাগ খুঁজে পাওয়া যায়নি' }, { status: 400 });
    updates.category_id = body.category_id;
  }
  if (body.degree !== undefined) updates.degree = [...new Set(body.degree.map((s: string) => s.trim()).filter(Boolean))];
  if (body.bmdc_registration_no !== undefined) updates.bmdc_registration_no = body.bmdc_registration_no || null;
  if (body.experience_years !== undefined) updates.experience_years = body.experience_years;
  if (body.bio_translations !== undefined) updates.bio_translations = body.bio_translations;
  if (body.expertise_tags !== undefined) updates.expertise_tags = [...new Set(body.expertise_tags.map((s: string) => s.trim()).filter(Boolean))];
  if (body.treats_conditions !== undefined) updates.treats_conditions = [...new Set(body.treats_conditions.map((s: string) => s.trim()).filter(Boolean))];
  if (body.languages !== undefined) updates.languages = [...new Set(body.languages.map((s: string) => s.trim()).filter(Boolean))];
  if (body.search_aliases !== undefined) updates.search_aliases = [...new Set(body.search_aliases.map((s: string) => s.trim()).filter(Boolean))];
  if (body.consultation_fee_min !== undefined) updates.consultation_fee_min = body.consultation_fee_min ?? null;
  if (body.consultation_fee_max !== undefined) updates.consultation_fee_max = body.consultation_fee_max ?? null;
  if (body.whatsapp_number !== undefined) updates.whatsapp_number = body.whatsapp_number || null;
  if (body.verification_status !== undefined) updates.verification_status = body.verification_status;
  if (body.is_available !== undefined) updates.is_available = body.is_available;
  if (body.is_featured !== undefined) updates.is_featured = body.is_featured;
  if (body.featured_priority !== undefined) updates.featured_priority = body.featured_priority;

  if (body.slug !== undefined) {
    const raw = (body.slug ?? '').trim();
    const nt = existing.name_translations as { bn?: string; en?: string } | null;
    const base = raw ? slugify(raw) : doctorSlugBase(nt?.bn ?? '', nt?.en ?? '');
    const slug = raw ? slugify(raw) : base || existing.slug;
    if (!slug) return NextResponse.json({ error: 'একটি স্লাগ দরকার' }, { status: 400 });
    if (slug !== existing.slug) {
      const { data: clash } = await supabase.from('doctors').select('id').eq('slug', slug).is('deleted_at', null).maybeSingle();
      if (clash) return NextResponse.json({ error: `স্লাগ "${slug}" আগে থেকেই আছে` }, { status: 409 });
    }
    updates.slug = slug;
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from('doctors').update(updates as never).eq('id', id);
    if (error) return NextResponse.json({ error: 'আপডেট করা যায়নি: ' + error.message }, { status: 500 });
  }

  // chambers replacement logic
  if (body.chambers !== undefined) {
    const { data: existingChambers } = await supabase.from('chambers').select('id').eq('doctor_id', id).is('deleted_at', null);
    const existingIds = new Set((existingChambers ?? []).map((c: { id: string }) => c.id));
    const incomingIds = new Set(body.chambers.filter((c) => c.id).map((c) => c.id as string));

    // soft-delete chambers not in incoming
    for (const eid of existingIds) {
      if (!incomingIds.has(eid)) {
        await supabase.from('chambers').update({ deleted_at: new Date().toISOString() } as never).eq('id', eid);
      }
    }

    if (body.chambers.length > 0) {
      const locIds2 = [...new Set(body.chambers.map((c) => (c as { location_id: string }).location_id))];
      const { data: locs } = await supabase.from('locations').select('id').in('id', locIds2).is('deleted_at', null);
      const locSet = new Set((locs ?? []).map((l: { id: string }) => l.id));
      const missing = locIds2.filter((lid: string) => !locSet.has(lid));
      if (missing.length) return NextResponse.json({ error: 'কিছু এলাকা খুঁজে পাওয়া যায়নি' }, { status: 400 });
    }

    // enforce single primary among incoming
    let primarySeen = false;
    for (let idx = 0; idx < body.chambers.length; idx++) {
      const c = body.chambers[idx]!;
      const isPrimary = c.is_primary && !primarySeen ? (primarySeen = true, true) : false;
      const payload = {
        doctor_id: id,
        chamber_name: c.chamber_name.trim(),
        location_id: c.location_id,
        address_line: c.address_line.trim(),
        phone: c.phone.trim(),
        whatsapp_number: c.whatsapp_number || null,
        map_link: c.map_link || null,
        latitude: c.latitude ?? null,
        longitude: c.longitude ?? null,
        consultation_fee: c.consultation_fee ?? null,
        schedule: (c.schedule ?? []) as unknown as never,
        is_primary: isPrimary,
        display_order: c.display_order ?? idx,
        is_active: c.is_active ?? true,
      };

      if (c.id && existingIds.has(c.id)) {
        const { error } = await supabase.from('chambers').update(payload as never).eq('id', c.id).eq('doctor_id', id);
        if (error) return NextResponse.json({ error: 'চেম্বার আপডেট করা যায়নি: ' + error.message }, { status: 500 });
      } else {
        const { error } = await supabase.from('chambers').insert(payload as never);
        if (error) return NextResponse.json({ error: 'চেম্বার যোগ করা যায়নি: ' + error.message }, { status: 500 });
      }
    }

    // ensure only one primary: if incoming had no primary but existing had one, keep existing primary
    // Our loop already coerced duplicates; if no is_primary in incoming, the doctor will have 0 primaries — fix by setting first active as primary
    if (!primarySeen && body.chambers.length > 0) {
      const { data: chs } = await supabase.from('chambers').select('id').eq('doctor_id', id).is('deleted_at', null).order('display_order').limit(1);
      if (chs && chs[0]) {
        await supabase.from('chambers').update({ is_primary: true } as never).eq('id', chs[0].id);
      }
    }
  }

  const { data: updated } = await supabase.from('doctors').select('*').eq('id', id).is('deleted_at', null).maybeSingle();

  await writeAudit(supabase, session.id, 'update', 'doctor', id, { before: existing, after: updated });

  return NextResponse.json({ doctor: updated });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await requireRole('admin');
  const supabase = createServiceRoleClient();
  const id = params.id;

  const { data: existing } = await supabase.from('doctors').select('id, slug').eq('id', id).is('deleted_at', null).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'ডাক্তার খুঁজে পাওয়া যায়নি' }, { status: 404 });

  const { error } = await supabase.from('doctors').update({ deleted_at: new Date().toISOString() } as never).eq('id', id);
  if (error) return NextResponse.json({ error: 'মুছে ফেলা যায়নি: ' + error.message }, { status: 500 });

  // chambers cascade via FK ON DELETE CASCADE — but we soft-delete, so soft-delete chambers too
  await supabase.from('chambers').update({ deleted_at: new Date().toISOString() } as never).eq('doctor_id', id).is('deleted_at', null);

  await writeAudit(supabase, session.id, 'delete', 'doctor', id, { before: existing });

  return NextResponse.json({ ok: true });
}
