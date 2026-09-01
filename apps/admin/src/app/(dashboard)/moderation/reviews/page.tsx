import { requireRole } from '@/lib/supabase/auth-verify';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { ReviewsQueue } from '@/components/moderation/ReviewsQueue';

export const dynamic = 'force-dynamic';

type SP = { status?: string };

/**
 * Reviews Moderation — ADMIN-PANEL-SPEC.md A03 unified moderation
 * queue pattern, reviews variant (`/moderation/reviews`).
 * TODO.md Phase 9.4 — this route (and its two siblings
 * /moderation/qa, /moderation/reports) never existed despite
 * AttentionCards.tsx, nav-config.ts, and the RLS layer all already
 * assuming it did — see the finding writeup in TODO.md for how this
 * was traced. Without this page, no user-submitted review could ever
 * become publicly visible (reviews_select RLS requires
 * status='approved', and nothing anywhere ever set it).
 */
export default async function ReviewsModerationPage({ searchParams }: { searchParams: SP }) {
  await requireRole('admin');
  const supabase = createServiceRoleClient();

  const statuses = ['pending', 'approved', 'rejected'];
  const tab = statuses.includes(searchParams.status ?? '') ? (searchParams.status as string) : 'pending';

  const counts = { pending: 0, approved: 0, rejected: 0 };
  await Promise.all(
    statuses.map(async (s) => {
      const { count } = await supabase
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('status', s as never)
        .is('deleted_at', null);
      counts[s as keyof typeof counts] = count ?? 0;
    })
  );

  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, entity_type, entity_id, reviewer_name, rating, review_text, admin_reply, status, created_at')
    .eq('status', tab as never)
    .is('deleted_at', null)
    .order('created_at', { ascending: tab === 'pending' })
    .limit(100);

  const rows = (reviews ?? []) as {
    id: string;
    entity_type: 'doctor' | 'hospital';
    entity_id: string;
    reviewer_name: string;
    rating: number;
    review_text: string;
    admin_reply: string | null;
    status: string;
    created_at: string;
  }[];

  const doctorIds = [...new Set(rows.filter((r) => r.entity_type === 'doctor').map((r) => r.entity_id))];
  const hospitalIds = [...new Set(rows.filter((r) => r.entity_type === 'hospital').map((r) => r.entity_id))];

  const nameMap = new Map<string, string>();
  const slugMap = new Map<string, string>();
  if (doctorIds.length > 0) {
    const { data: docs } = await supabase.from('doctors').select('id, name_translations, slug').in('id', doctorIds);
    for (const d of docs ?? []) {
      const t = (d as { name_translations: { bn?: string; en?: string } | null }).name_translations;
      nameMap.set((d as { id: string }).id, (t?.bn || t?.en || (d as { slug: string }).slug) as string);
      slugMap.set((d as { id: string }).id, `/doctors/${(d as { id: string }).id}`);
    }
  }
  if (hospitalIds.length > 0) {
    const { data: hosps } = await supabase.from('hospitals').select('id, name_translations, slug').in('id', hospitalIds);
    for (const h of hosps ?? []) {
      const t = (h as { name_translations: { bn?: string; en?: string } | null }).name_translations;
      nameMap.set((h as { id: string }).id, (t?.bn || t?.en || (h as { slug: string }).slug) as string);
      slugMap.set((h as { id: string }).id, `/hospitals/${(h as { id: string }).id}`);
    }
  }

  const enriched = rows.map((r) => ({
    ...r,
    entity_name: nameMap.get(r.entity_id) ?? '—',
    entity_href: slugMap.get(r.entity_id) ?? '#',
  }));

  return <ReviewsQueue reviews={enriched} tab={tab} counts={counts} />;
}
