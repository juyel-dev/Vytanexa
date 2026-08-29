import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireRole } from '@/lib/supabase/auth-verify';
import { writeAudit } from '@/lib/audit';
import { slugify } from '@/lib/location-utils';

/**
 * POST /api/admin/locations/import — CSV bulk import (A04 "Bulk Import").
 *
 * The client parses the CSV into rows and POSTs JSON here; the server
 * does the authoritative work so slug generation + dedup logic lives in
 * exactly one place. Rows match the downloadable template:
 *
 *   state_name_bn, state_name_en, district_name_bn, district_name_en,
 *   sub_district_name_bn, sub_district_name_en, slug, latitude, longitude
 *
 * Each row creates ONE entity at its deepest filled level (state → district
 * → sub_district). Parents are matched by the deterministic name → slug rule
 * (slugify(name_en || name_bn)), so the same spelling must appear across
 * the rows that share a parent. Duplicates are SKIPPED (never overwritten)
 * on slug.
 */

const importRowSchema = z.object({
  state_bn: z.string().trim().default(''),
  state_en: z.string().trim().default(''),
  district_bn: z.string().trim().default(''),
  district_en: z.string().trim().default(''),
  sub_district_bn: z.string().trim().default(''),
  sub_district_en: z.string().trim().default(''),
  slug: z.string().trim().optional().default(''),
  latitude: z.string().trim().optional().default(''),
  longitude: z.string().trim().optional().default(''),
});
type Row = z.infer<typeof importRowSchema>;

const importBodySchema = z.object({ rows: z.array(importRowSchema).min(1).max(5000) });

type Skip = { row: number; reason: string };

function numOrNull(s: string): number | null {
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function baseSlug(...names: string[]): string {
  return slugify(names.find((n) => n.trim()) ?? '');
}

export async function POST(request: Request) {
  const session = await requireRole('admin');
  const parsed = importBodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'অবৈধ CSV ডেটা' }, { status: 400 });
  }
  const rows = parsed.data.rows;
  const supabase = createServiceRoleClient();

  // Preload existing locations so we can (a) skip duplicates and (b) attach
  // new children to parents that already exist in the DB.
  const { data: existingRows } = await supabase
    .from('locations')
    .select('id, slug, type, name_translations')
    .is('deleted_at', null)
    .limit(10000);

  const seenSlugs = new Set<string>();
  const idBySlug = new Map<string, string>();
  for (const r of existingRows ?? []) {
    seenSlugs.add(r.slug);
    idBySlug.set(r.slug, r.id);
    // Also register under the derived name slug, so a parent row whose slug
    // was manually chosen can still be found by its name spelling.
    const t = r.name_translations as { bn?: string; en?: string } | null;
    const derived = baseSlug(t?.en ?? '', t?.bn ?? '');
    if (derived && !idBySlug.has(derived)) idBySlug.set(derived, r.id);
  }

  const insertedIds = new Map<string, string>();
  const skipped: Skip[] = [];
  let created = 0;

  const uniquify = (base: string): string => {
    if (!base) return base;
    let slug = base;
    let i = 2;
    while (seenSlugs.has(slug)) slug = `${base}-${i++}`;
    seenSlugs.add(slug);
    return slug;
  };

  const insertLocation = async (
    type: 'state' | 'district' | 'sub_district',
    parentId: string | null,
    names: { bn: string; en: string },
    slug: string,
    lat: number | null,
    lng: number | null
  ): Promise<string | null> => {
    const { data, error } = await supabase
      .from('locations')
      .insert({
        type,
        parent_id: parentId,
        name_translations: { bn: names.bn, en: names.en, hi: '' },
        slug,
        latitude: lat,
        longitude: lng,
        is_active: true,
      })
      .select('id')
      .single();
    if (error || !data) return null;
    created += 1;
    insertedIds.set(slug, data.id);
    idBySlug.set(slug, data.id);
    return data.id;
  };

  // Resolve an existing/new parent id by name-derived slug, in batch-first
  // order (states already inserted before districts before sub-districts).
  const resolveParent = (name: string, en: string): string | null => {
    const derived = baseSlug(en, name);
    return idBySlug.get(derived) ?? null;
  };

  // Pass 1 — states (rows whose only filled level is state).
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] as Row;
    if (!(r.state_bn || r.state_en)) continue;
    if (r.district_bn || r.district_en || r.sub_district_bn || r.sub_district_en) continue;
    const base = r.slug || baseSlug(r.state_en, r.state_bn);
    if (!base) {
      skipped.push({ row: i + 1, reason: 'State নাম ফাঁকা' });
      continue;
    }
    const slug = uniquify(base);
    await insertLocation('state', null, { bn: r.state_bn, en: r.state_en }, slug, numOrNull(r.latitude), numOrNull(r.longitude));
  }

  // Pass 2 — districts.
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] as Row;
    if (!(r.district_bn || r.district_en)) continue;
    if (r.sub_district_bn || r.sub_district_en) continue; // this row is a sub_district row
    const parentId = resolveParent(r.state_bn, r.state_en);
    if (!parentId) {
      skipped.push({ row: i + 1, reason: `State "${r.state_en || r.state_bn}" খুঁজে পাওয়া যায়নি` });
      continue;
    }
    const base = r.slug || baseSlug(r.district_en, r.district_bn);
    if (!base) {
      skipped.push({ row: i + 1, reason: 'জেলার নাম ফাঁকা' });
      continue;
    }
    const slug = uniquify(base);
    await insertLocation('district', parentId, { bn: r.district_bn, en: r.district_en }, slug, numOrNull(r.latitude), numOrNull(r.longitude));
  }

  // Pass 3 — sub-districts.
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] as Row;
    if (!(r.sub_district_bn || r.sub_district_en)) continue;
    const parentId = resolveParent(r.district_bn, r.district_en);
    if (!parentId) {
      skipped.push({ row: i + 1, reason: `জেলা "${r.district_en || r.district_bn}" খুঁজে পাওয়া যায়নি` });
      continue;
    }
    const base = r.slug || baseSlug(r.sub_district_en, r.sub_district_bn);
    if (!base) {
      skipped.push({ row: i + 1, reason: 'উপজেলার নাম ফাঁকা' });
      continue;
    }
    const slug = uniquify(base);
    await insertLocation('sub_district', parentId, { bn: r.sub_district_bn, en: r.sub_district_en }, slug, numOrNull(r.latitude), numOrNull(r.longitude));
  }

  await writeAudit(supabase, session.id, 'create', 'location_import', null, {
    after: { created, skippedCount: skipped.length },
  });

  return NextResponse.json({ created, skippedCount: skipped.length, skipped }, { status: 201 });
}