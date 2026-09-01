import { requireRole } from '@/lib/supabase/auth-verify';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { ReportsQueue } from '@/components/moderation/ReportsQueue';

export const dynamic = 'force-dynamic';

type SP = { status?: string };

/**
 * Data Reports Moderation — ADMIN-PANEL-SPEC.md A03 unified pattern,
 * reports variant (`/moderation/reports`). TODO.md Phase 9.4. Lower
 * severity than reviews/questions (doesn't gate public RLS
 * visibility - reports are an internal admin-facing queue), but the
 * same "route was assumed to exist, never built" gap.
 *
 * entity_type is technically doctor|hospital|article|question|poll
 * (shared entity_type enum), but web/components/shared/
 * DataReportSheet.tsx is only ever mounted from doctor and hospital
 * profiles today - name resolution below covers those two plus a
 * safe fallback for the other three, so this doesn't silently break
 * if the report sheet is ever wired to a third entity type later.
 */
export default async function ReportsModerationPage({ searchParams }: { searchParams: SP }) {
  await requireRole('admin');
  const supabase = createServiceRoleClient();

  const statuses = ['open', 'resolved', 'dismissed'];
  const tab = statuses.includes(searchParams.status ?? '') ? (searchParams.status as string) : 'open';

  const counts = { open: 0, resolved: 0, dismissed: 0 };
  await Promise.all(
    statuses.map(async (s) => {
      const { count } = await supabase.from('data_reports').select('id', { count: 'exact', head: true }).eq('status', s as never);
      counts[s as keyof typeof counts] = count ?? 0;
    })
  );

  const { data: reports } = await supabase
    .from('data_reports')
    .select('id, entity_type, entity_id, reason, detail, status, created_at')
    .eq('status', tab as never)
    .order('created_at', { ascending: tab === 'open' })
    .limit(100);

  const rows = (reports ?? []) as {
    id: string;
    entity_type: string;
    entity_id: string;
    reason: string;
    detail: string | null;
    status: string;
    created_at: string;
  }[];

  const doctorIds = [...new Set(rows.filter((r) => r.entity_type === 'doctor').map((r) => r.entity_id))];
  const hospitalIds = [...new Set(rows.filter((r) => r.entity_type === 'hospital').map((r) => r.entity_id))];

  const nameMap = new Map<string, string>();
  const hrefMap = new Map<string, string>();
  if (doctorIds.length > 0) {
    const { data: docs } = await supabase.from('doctors').select('id, name_translations, slug').in('id', doctorIds);
    for (const d of docs ?? []) {
      const t = (d as { name_translations: { bn?: string; en?: string } | null }).name_translations;
      nameMap.set((d as { id: string }).id, (t?.bn || t?.en || (d as { slug: string }).slug) as string);
      hrefMap.set((d as { id: string }).id, `/doctors/${(d as { id: string }).id}`);
    }
  }
  if (hospitalIds.length > 0) {
    const { data: hosps } = await supabase.from('hospitals').select('id, name_translations, slug').in('id', hospitalIds);
    for (const h of hosps ?? []) {
      const t = (h as { name_translations: { bn?: string; en?: string } | null }).name_translations;
      nameMap.set((h as { id: string }).id, (t?.bn || t?.en || (h as { slug: string }).slug) as string);
      hrefMap.set((h as { id: string }).id, `/hospitals/${(h as { id: string }).id}`);
    }
  }

  const enriched = rows.map((r) => ({
    ...r,
    entity_name: nameMap.get(r.entity_id) ?? `${r.entity_type} · ${r.entity_id.slice(0, 8)}`,
    entity_href: hrefMap.get(r.entity_id) ?? '#',
  }));

  return <ReportsQueue reports={enriched} tab={tab} counts={counts} />;
}
