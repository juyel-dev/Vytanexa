import 'server-only';
import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';
import { locationCreateSchema } from '@/lib/validations/locations';
import {
  autoSlug,
  LOCATION_LEVELS,
  type LocationType,
} from '@/lib/location-utils';
import type { Database } from '@vytanexa/database';

type Supabase = ReturnType<typeof createServiceRoleClient>;

function expectedParentType(type: LocationType): LocationType | null {
  const i = LOCATION_LEVELS.indexOf(type);
  return i > 0 ? (LOCATION_LEVELS[i - 1] as LocationType) : null;
}

/**
 * POST /api/admin/locations — create a location (A04).
 * Gate: admin/super_admin via requireRole('admin') — editors/moderators
 * cannot mutate the entity tree.
 *
 * Enforces (defense in depth, mirroring the DB CHECK constraint):
 * - a 'state' can't have a parent
 * - anything else MUST have a parent of exactly one level up
 * - name_translations.bn is required
 * - slug is unique (auto-generated from bn/en name if omitted)
 */
export async function POST(request: Request) {
  const session = await requireRole('admin');
  const parsed = locationCreateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'অবৈধ ডেটা' }, { status: 400 });
  }
  const body = parsed.data;
  const supabase = createServiceRoleClient();

  // Verify parent exists and sits exactly one level above this node.
  if (body.parent_id) {
    const { data: parent } = await supabase
      .from('locations')
      .select('id, type, is_active')
      .eq('id', body.parent_id)
      .is('deleted_at', null)
      .maybeSingle();

    if (!parent) {
      return NextResponse.json({ error: 'প্যারেন্ট এলাকা খুঁজে পাওয়া যায়নি' }, { status: 400 });
    }
    if (parent.type !== expectedParentType(body.type)) {
      return NextResponse.json({ error: 'এই প্যারেন্টের নিচে ওই স্তরের এলাকা যোগ করা যায় না' }, { status: 400 });
    }
  }

  // Slug: use provided, else derive; must be unique.
  const slug = (body.slug || autoSlug(body.name_translations.bn, body.name_translations.en)).trim();
  if (!slug) {
    return NextResponse.json({ error: 'একটি স্লাগ দরকার (নাম থেকে স্বয়ংক্রিয়ভাবে তৈরি হয়নি)' }, { status: 400 });
  }
  const { data: clash } = await supabase
    .from('locations')
    .select('id')
    .eq('slug', slug)
    .is('deleted_at', null)
    .maybeSingle();
  if (clash) {
    return NextResponse.json({ error: `স্লাগ "${slug}" আগে থেকেই আছে — অন্য একটি বেছে নিন` }, { status: 409 });
  }

  const { data: created, error } = await supabase
    .from('locations')
    .insert({
      type: body.type,
      parent_id: body.parent_id ?? null,
      name_translations: body.name_translations,
      slug,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      is_active: body.is_active ?? true,
      display_order: body.display_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'সংরক্ষণ করা যায়নি: ' + error.message }, { status: 500 });
  }

  await writeAudit(supabase, session.id, 'create', 'location', created.id, {
    after: created,
    ip: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined,
  });

  return NextResponse.json({ location: created }, { status: 201 });
}