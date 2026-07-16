import { createClient } from '@/lib/supabase/server';

/**
 * Quick Stats Bar — VYTANEXA-BLUEPRINT.md § S04 SEC-03
 * Live counts from the real Supabase project. Uses `head: true` count
 * queries (no row data fetched, just the count — cheap even as the
 * tables grow to thousands of rows).
 *
 * Client-side count-up animation (S04 spec: 0 → actual over 1200ms on
 * viewport entry) is deferred to a later pass — this Server Component
 * renders the final numbers directly, which is correct and complete on
 * its own; the animation is a progressive enhancement, not a
 * correctness requirement.
 */
export async function QuickStatsBar() {
  const supabase = createClient();

  const [{ count: doctorCount }, { count: hospitalCount }, { count: districtCount }] =
    await Promise.all([
      supabase
        .from('doctors')
        .select('*', { count: 'exact', head: true })
        .eq('verification_status', 'verified'),
      supabase
        .from('hospitals')
        .select('*', { count: 'exact', head: true })
        .eq('verification_status', 'verified'),
      supabase
        .from('locations')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'district')
        .eq('is_active', true),
    ]);

  const stats = [
    { icon: '👨‍⚕️', label: 'ডাক্তার', value: doctorCount ?? 0 },
    { icon: '🏥', label: 'হাসপাতাল', value: hospitalCount ?? 0 },
    { icon: '📍', label: 'জেলা', value: districtCount ?? 0 },
  ];

  // All-zero is a legitimate, common early-launch state (empty DB) —
  // still rendered, not hidden, so the operator/tester can see the
  // live count is actually wired up rather than silently vanishing.
  return (
    <section className="flex gap-2.5 overflow-x-auto px-4 py-2 [scrollbar-width:none]">
      {stats.map(({ icon, label, value }) => (
        <div
          key={label}
          className="flex min-w-[100px] flex-col gap-1 rounded-lg border border-neutral-200 bg-white p-3 shadow-sm"
        >
          <span className="text-xl">{icon}</span>
          <span className="text-xl font-bold text-neutral-900">{value}+</span>
          <span className="text-xs text-neutral-500">{label}</span>
        </div>
      ))}
    </section>
  );
}
