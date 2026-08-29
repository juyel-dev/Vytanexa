import 'server-only';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';
import { doctorCreateSchema } from '@/lib/validations/doctors';
import { doctorSlugBase } from '@/lib/doctor-utils';

/**
 * POST /api/admin/doctors — create a doctor with optional chambers (A05).
 * Gate: admin/super_admin. Slug auto from bn/en if omitted, unique.
 * Chambers are inserted atomically after the doctor row is created;
 * only ONE is_primary=true is allowed — if multiple are flagged, the
 * first wins and the rest are coerced to false (operator-friendly).
 */
export async function POST(request: Request) {
  const session = await requireRole('admin');
  const parsed = doctorCreateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'অবৈধ ডেটা' }, { status: 400 });
  }
  const body = parsed.data;
  const supabase = createServiceRoleClient();

  // category must exist
  const { data: cat } = await supabase.from('categories').select('id').eq('id', body.category_id).is('deleted_at', null).maybeSingle();
  if (!cat) return NextResponse.json({ error: 'বিভাগ খুঁজে পাওয়া যায়নি' }, { status: 400 });

  // slug
  const rawSlug = (body.slug ?? '').trim();
  const slug = rawSlug ? rawSlug : doctorSlugBase(body.name_translations.bn, body.name_translations.en);
  if (!slug) return NextResponse.json({ error: 'একটি স্লাগ দরকার' }, { status: 400 });
  const { data: clash } = await supabase.from('doctors').select('id').eq('slug', slug).is('deleted_at', null).maybeSingle();
  if (clash) return NextResponse.json({ error: `স্লাগ "${slug}" আগে থেকেই আছে` }, { status: 409 });

  // normalize arrays: trim + filter empty + dedup
  const norm = (arr: string[]) => [...new Set(arr.map((s) => s.trim()).filter(Boolean))];

  const { data: created, error } = await supabase
    .from('doctors')
    .insert({
      name_translations: body.name_translations,
      slug,
      photo_url: body.photo_url || null,
      category_id: body.category_id,
      degree: norm(body.degree ?? []),
      bmdc_registration_no: body.bmdc_registration_no || null,
      experience_years: body.experience_years ?? 0,
      bio_translations: body.bio_translations ?? { bn: '', en: '', hi: '' },
      expertise_tags: norm(body.expertise_tags ?? []),
      treats_conditions: norm(body.treats_conditions ?? []),
      languages: norm(body.languages ?? ['bn']),
      search_aliases: norm(body.search_aliases ?? []),
      consultation_fee_min: body.consultation_fee_min ?? null,
      consultation_fee_max: body.consultation_fee_max ?? null,
      whatsapp_number: body.whatsapp_number || null,
      verification_status: body.verification_status ?? 'pending',
      is_available: body.is_available ?? true,
      is_featured: body.is_featured ?? false,
      featured_priority: body.featured_priority ?? 0,
    })
    .select()
    .single();

  if (error || !created) {
    return NextResponse.json({ error: 'ডাক্তার সংরক্ষণ করা যায়নি: ' + (error?.message ?? '') }, { status: 500 });
  }

  // chambers
  if (body.chambers && body.chambers.length > 0) {
    // validate location_ids exist
    const locIds = [...new Set(body.chambers.map((c) => c.location_id))];
    const { data: locs } = await supabase.from('locations').select('id').in('id', locIds).is('deleted_at', null);
    const locSet = new Set((locs ?? []).map((l) => l.id));
    const missing = locIds.filter((id) => !locSet.has(id));
    if (missing.length) return NextResponse.json({ error: 'কিছু এলাকা খুঁজে পাওয়া যায়নি' }, { status: 400 });

    // enforce single primary
    let primarySeen = false;
    const rows = body.chambers.map((c, idx) => {
      const isPrimary = c.is_primary && !primarySeen ? (primarySeen = true, true) : false;
      return {
        doctor_id: created.id,
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
    });

    const { error: chErr } = await supabase.from('chambers').insert(rows as never);
    if (chErr) {
      // rollback doctor? best-effort: keep doctor but report chambers error
      // For strict correctness we delete the doctor if chambers failed due to constraint
      await supabase.from('doctors').delete().eq('id', created.id);
      return NextResponse.json({ error: 'চেম্বার সংরক্ষণ করা যায়নি: ' + chErr.message }, { status: 500 });
    }
  }

  await writeAudit(supabase, session.id, 'create', 'doctor', created.id, { after: created });

  return NextResponse.json({ doctor: created }, { status: 201 });
}
