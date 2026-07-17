import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getLocalizedField } from '@/lib/i18n';

/**
 * Category / Specialty Grid — VYTANEXA-BLUEPRINT.md § S04 SEC-05
 * Server Component: queries the live `categories` table (RLS: public
 * read, is_active=true, deleted_at IS NULL — DATABASE-SCHEMA.md § 2.6)
 * plus a per-category doctor count via Supabase's embedded-resource
 * count syntax. Admin controls visibility (`is_visible_home`) and
 * order (`display_order`) — this section is empty-state-hidden
 * entirely if no categories exist yet, per the section's own design
 * intent (S04: "Empty-data sections auto-hide").
 */
export async function CategoryGrid() {
  const supabase = createClient();

  const { data: categories, error } = await supabase
    .from('categories')
    .select('id, slug, name_translations, icon_key')
    .eq('is_active', true)
    .eq('is_visible_home', true)
    .order('display_order', { ascending: true })
    .limit(9);

  if (error) {
    // Fail closed and quiet on the homepage — a broken section here
    // should never take down the whole page. Server-side error is
    // still logged for diagnosis.
    console.error('CategoryGrid query failed:', error.message);
    return null;
  }

  if (!categories || categories.length === 0) {
    return null;
  }

  // Doctor counts per category: fetched as a single lightweight query
  // (one column, verified doctors only) and grouped client-side rather
  // than a PostgREST embedded reverse-relationship count. The reverse
  // embed (`doctors(count)` from the `categories` side) works fine at
  // the database/PostgREST level, but supabase-js's generated types
  // can't statically infer it here — `categories` carries no FK column
  // itself, so its `Relationships` array doesn't describe the reverse
  // link. This approach is simpler and fully type-safe; if the doctors
  // table grows very large, this can later move to a dedicated counts
  // view or RPC without changing this component's contract.
  const { data: doctorRows } = await supabase
    .from('doctors')
    .select('category_id')
    .eq('verification_status', 'verified');

  const countByCategory = new Map<string, number>();
  for (const row of doctorRows ?? []) {
    countByCategory.set(row.category_id, (countByCategory.get(row.category_id) ?? 0) + 1);
  }

  return (
    <section className="px-4 py-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bengali-display text-[17px] font-bold text-brand-600">
          বিভাগ অনুযায়ী ডাক্তার খুঁজুন
        </h2>
        <Link href="/doctors" className="text-[13px] text-brand-600">
          সব দেখুন →
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {categories.map((cat) => {
          const doctorCount = countByCategory.get(cat.id) ?? 0;

          return (
            <Link
              key={cat.id}
              href={`/doctors?specialty=${cat.slug}`}
              className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border border-neutral-200 bg-white p-2 text-center shadow-sm transition-transform active:scale-95"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-xl">
                {/* icon_key resolves to a curated icon set once the
                    Admin Panel's icon picker (A04) exists; emoji
                    fallback keeps this section functional today. */}
                {cat.icon_key ?? '🩺'}
              </span>
              <span className="line-clamp-2 font-bengali-body text-[13px] font-semibold text-neutral-800">
                {getLocalizedField(cat.name_translations)}
              </span>
              {doctorCount > 0 && (
                <span className="text-[11px] text-neutral-500">{doctorCount} জন</span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
