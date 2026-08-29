import 'server-only';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';
import { locationUpdateSchema } from '@/lib/validations/locations';
import { autoSlug } from '@/lib/location-utils';

type Supabase = ReturnType<typeof createServiceRoleClient>;

const ATTACHED_TABLES = [
  { table: 'chambers', label: 'চেম্বার' },
  { table: 'hospitals', label: 'হাসপাতাল' },
  { table: 'blood_donors', label: 'রক্তদাতা' },
  { table: 'ambulance_services', label: 'অ্যাম্বুলেন্স' },
] as const;

/**
 * PATCH /api/admin/locations/[id] — update a location.
 * DELETE /api/admin/locations/[id] — soft-delete (sets deleted_at).
 *
 * DELETE is BLOCKED (409) whenever the location still has children or
 * any doctors/hospitals/chambers/blood/ambulance records attached — the
 * message names the counts so the operator knows what to move first.
 * Empty leaf locations soft-delete freely (deleted_at, not a hard
 * DELETE — preserves the audit trail + referential integrity).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireRole('admin');
  const supabase = createServiceRoleClient();
  const id = params.id;

  const { data: existing } = await supabase
    .from('locations')
    .select('id, slug, deleted_at')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'এলাকা খুঁজে পাওয়া যায়নি' }, { status: 404 });
  }

  // 1) Children (non-deleted) block deletion.
  const { count: childCount } = await supabase
    .from('locations')
    .select('id', { count: 'exact', head: true })
    .eq('parent_id', id)
    .is('deleted_at', null);
  if (childCount) {
    return NextResponse.json(
      { error: `এই এলাকার নিচে আরও ${childCount}টি সাব-এলাকা আছে। প্রথমে সেগুলো সরান বা মুছুন।` },
      { status: 409 }
    );
  }

  // 2) Any attached business data blocks deletion (soft-deleted chambers/
  //    hospitals excluded via .is('deleted_at', null) where supported).
  const blockers: string[] = [];
  for (const { table, label } of ATTACHED_TABLES) {
    let q = supabase.from(table).select('id', { count: 'exact', head: true }).eq('location_id', id);
    if (table === 'chambers' || table === 'hospitals') {
      q = q.is('deleted_at', null);
    }
    const { count } = await q;
    if (count) blockers.push(`${count}টি ${label}`);
  }
  if (blockers.length) {
    return NextResponse.json(
      { error: `এই এলাকায় এখনো ${blockers.join(', ')} যুক্ত আছে। আগে সেগুলো সরান বা অন্য এলাকায় স্থানান্তর করুন।` },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from('locations')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'মুছে ফেলা যায়নি: ' + error.message }, { status: 500 });
  }

  await writeAudit(supabase, session.id, 'delete', 'location', id, { before: existing });
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireRole('admin');
  const parsed = locationUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'অবৈধ ডেটা' }, { status: 400 });
  }
  const body = parsed.data;
  const supabase = createServiceRoleClient();
  const id = params.id;

  const { data: existing } = await supabase
    .from('locations')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'এলাকা খুঁজে পাওয়া যায়নি' }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  if (body.type !== undefined) updates.type = body.type;
  if (body.parent_id !== undefined) updates.parent_id = body.parent_id ?? null;
  if (body.name_translations !== undefined) updates.name_translations = body.name_translations;
  if (body.latitude !== undefined) updates.latitude = body.latitude ?? null;
  if (body.longitude !== undefined) updates.longitude = body.longitude ?? null;
  if (body.is_active !== undefined) updates.is_active = body.is_active;
  if (body.display_order !== undefined) updates.display_order = body.display_order;

  if (body.slug !== undefined) {
    const nt = existing.name_translations as { bn?: string; en?: string } | null;
    const slug = (body.slug || autoSlug(nt?.bn ?? '', nt?.en ?? '')).trim();
    if (!slug) {
      return NextResponse.json({ error: 'একটি স্লাগ দরকার' }, { status: 400 });
    }
    if (slug !== existing.slug) {
      const { data: clash } = await supabase
        .from('locations')
        .select('id')
        .eq('slug', slug)
        .is('deleted_at', null)
        .maybeSingle();
      if (clash) {
        return NextResponse.json({ error: `স্লাগ "${slug}" আগে থেকেই আছে` }, { status: 409 });
      }
    }
    updates.slug = slug;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ location: existing });
  }

  const { data: updated, error } = await supabase
    .from('locations')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(updates as never)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'সংরক্ষণ করা যায়নি: ' + error.message }, { status: 500 });
  }

  await writeAudit(supabase, session.id, 'update', 'location', id, {
    before: existing,
    after: updated,
    ip: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined,
  });

  return NextResponse.json({ location: updated });
}