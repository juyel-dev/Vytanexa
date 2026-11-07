import { createClient } from '@/lib/supabase/server';
import { getArticlesForGrid, getDoctorsByIds, getHospitalsByIds } from '@/lib/queries/custom-page';
import { ArticleCard } from '@/components/shared/ArticleCard';
import { DoctorCard } from '@/components/shared/DoctorCard';
import { HospitalCard } from '@/components/shared/HospitalCard';
import type { MagazineGridBlock, DoctorGridBlock, HospitalGridBlock } from '@/lib/custom-page-blocks';

/**
 * `magazine_grid` block — VYTANEXA-BLUEPRINT.md § S19: "Article card
 * grid, filtered by category/tag — same ArticleCard component as
 * S13." Uses `getArticlesForGrid` (`lib/queries/custom-page.ts`), a
 * simple category/tag filter — not the full paginated `queryArticleList`
 * S13's list page needs, since this is a fixed-count curated grid.
 */
export async function MagazineGridBlockView({ block }: { block: MagazineGridBlock }) {
  const supabase = createClient();
  const articles = await getArticlesForGrid(supabase, {
    category: typeof block.category === 'string' ? block.category : undefined,
    tags: Array.isArray(block.tags) ? block.tags.filter((t) => typeof t === 'string') : undefined,
    limit: Math.min(Math.max(Math.trunc(Number(block.limit)) || 6, 1), 24),
  });
  if (articles.length === 0) return null;

  return (
    <div className="px-4 py-4">
      {block.heading && (
        <h2 className="mb-3 text-[16px] font-bold text-neutral-900">{block.heading}</h2>
      )}
      <div className="grid grid-cols-2 gap-3">
        {articles.map((a) => (
          <ArticleCard key={a.id} article={a} />
        ))}
      </div>
    </div>
  );
}

/**
 * `doctor_grid` block — VYTANEXA-BLUEPRINT.md § S19: "Curated list of
 * specific doctor IDs — same Card components as S06, admin hand-picks
 * entities, e.g. 'Camp Doctors' feature page." `getDoctorsByIds`
 * preserves the admin's chosen order rather than DB return order.
 */
export async function DoctorGridBlockView({ block }: { block: DoctorGridBlock }) {
  const ids = Array.isArray(block.doctor_ids) ? block.doctor_ids.filter((x) => typeof x === 'string').slice(0, 30) : [];
  if (ids.length === 0) return null;
  const supabase = createClient();
  const doctors = await getDoctorsByIds(supabase, ids);
  if (doctors.length === 0) return null;

  return (
    <div className="py-4">
      {block.heading && (
        <h2 className="mb-1 px-4 text-[16px] font-bold text-neutral-900">{block.heading}</h2>
      )}
      {doctors.map((d) => (
        <DoctorCard key={d.id} doctor={d} />
      ))}
    </div>
  );
}

export async function HospitalGridBlockView({ block }: { block: HospitalGridBlock }) {
  const ids = Array.isArray(block.hospital_ids) ? block.hospital_ids.filter((x) => typeof x === 'string').slice(0, 30) : [];
  if (ids.length === 0) return null;
  const supabase = createClient();
  const hospitals = await getHospitalsByIds(supabase, ids);
  if (hospitals.length === 0) return null;

  return (
    <div className="py-4">
      {block.heading && (
        <h2 className="mb-1 px-4 text-[16px] font-bold text-neutral-900">{block.heading}</h2>
      )}
      {hospitals.map((h) => (
        <HospitalCard key={h.id} hospital={h} />
      ))}
    </div>
  );
}
