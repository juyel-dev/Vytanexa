import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireAdmin } from '@/lib/supabase/auth-verify';
import { AttentionCards } from '@/components/dashboard/AttentionCards';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { SummaryCards } from '@/components/dashboard/SummaryCards';

/**
 * Dashboard Home — ADMIN-PANEL-SPEC.md § A03.
 *
 * Answers ONE question first: "আজ আমার কী করা দরকার?" — the
 * attention-needed row (pending queues) sits ABOVE the vanity-metrics
 * row (totals/charts), reversed from typical admin dashboards that
 * lead with charts. For a solo non-technical operator, "8 reviews
 * waiting" is actionable; a line chart is not — so it's positioned as
 * secondary/contextual, not the hero.
 *
 * Service-role reads: this is the admin panel, so reads bypass RLS
 * exactly as writes do (lib/supabase/service-role.ts). The acting
 * admin's identity is separately verified by the dashboard layout's
 * getAdminSession() guard; the service role is NOT a way to skip that
 * check — it's the mechanism by which an already-verified admin can
 * see the full dataset (pending moderation, all entities, audit log)
 * that RLS would otherwise hide from the anon key.
 */
export default async function DashboardPage() {
  // requireAdmin re-checks the session independently of the layout —
  // defense in depth per A02 (layout hides, routes enforce).
  const session = await requireAdmin();
  const supabase = createServiceRoleClient();

  // Parallel reads — each is independent, no N+1.
  const [reviewsRes, qaRes, reportsRes, leadsRes] = await Promise.all([
    supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .is('deleted_at', null),
    supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .is('deleted_at', null),
    supabase
      .from('data_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open'),
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new'),
  ]);

  const [doctorsRes, hospitalsRes, auditRes] = await Promise.all([
    supabase.from('doctors').select('id', { count: 'exact', head: true }),
    supabase.from('hospitals').select('id', { count: 'exact', head: true }),
    supabase
      .from('audit_logs')
      .select('action, entity_type, entity_id, created_at, admin_id, admin_users(name)')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const pending = {
    reviews: reviewsRes.count ?? 0,
    qa: qaRes.count ?? 0,
    reports: reportsRes.count ?? 0,
    leads: leadsRes.count ?? 0,
  };
  const totals = {
    doctors: doctorsRes.count ?? 0,
    hospitals: hospitalsRes.count ?? 0,
  };
  const activity = auditRes.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-admin-h1 text-neutral-900">স্বাগতম, {session.name} 👋</h1>
        <p className="mt-1 text-admin-body text-neutral-500">
          {totals.doctors} ডাক্তার · {totals.hospitals} হাসপাতাল · সর্বশেষ অ্যাডমিন কার্যকলাপ নিচে
        </p>
      </div>

      <AttentionCards pending={pending} />

      <SummaryCards totals={totals} />

      <RecentActivity activity={activity} />

      {pending.reviews === 0 &&
        pending.qa === 0 &&
        pending.reports === 0 &&
        pending.leads === 0 && (
          <div className="rounded-lg border border-life-200 bg-life-50 px-4 py-3 text-admin-body text-life-800">
            🎉 এই মুহূর্তে অনুমোদনের অপেক্ষায় কিছু নেই — সব আপ টু ডেট!
          </div>
        )}
    </div>
  );
}