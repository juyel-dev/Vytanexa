import { requireAdmin } from '@/lib/supabase/auth-verify';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { CategoriesManager } from '@/components/categories/CategoriesManager';

export const dynamic = 'force-dynamic';

/**
 * Categories Manager page — ADMIN-PANEL-SPEC.md § A04 (second half).
 * Server component: fetches categories + live doctor counts.
 */
export default async function CategoriesPage() {
  await requireAdmin();
  const supabase = createServiceRoleClient();

  const [{ data: cats, error }, { data: doctorRows }] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name_translations, slug, icon_key, search_keywords, display_order, is_visible_home, is_active')
      .is('deleted_at', null)
      .order('display_order', { ascending: true })
      .order('slug', { ascending: true })
      .limit(500),
    supabase.from('doctors').select('category_id').is('deleted_at', null).limit(10000),
  ]);

  if (error) {
    return (
      <div className="rounded-lg border border-emergency-200 bg-emergency-50 p-6 text-admin-body text-emergency-700">
        বিভাগ লোড করা যায়নি: {error.message}
      </div>
    );
  }

  const countByCat = new Map<string, number>();
  for (const r of doctorRows ?? []) {
    const id = (r as { category_id: string }).category_id;
    countByCat.set(id, (countByCat.get(id) ?? 0) + 1);
  }

  const enriched = (cats ?? []).map((c) => ({
    ...c,
    doctor_count: countByCat.get(c.id) ?? 0,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-admin-h1 text-neutral-900">বিভাগ (বিশেষজ্ঞতা) ম্যানেজমেন্ট</h1>
        <p className="mt-1 text-admin-body text-neutral-500">
          টেনে-এনে বা ↑↓ দিয়ে ক্রম বদলান — হোমপেজের Category Grid সঙ্গে সঙ্গে আপডেট হয়। হোমপেজ টগল বন্ধ করলে বিভাগটি তালিকায় থাকবে কিন্তু হোমপেজে দেখাবে না।
        </p>
      </div>
      <CategoriesManager initialCategories={enriched as never} />
    </div>
  );
}
