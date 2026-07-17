import type { ReactElement } from 'react';
import { AnnouncementBanner } from '@/components/home/AnnouncementBanner';
import { HeroBannerSlider } from '@/components/home/HeroBannerSlider';
import { QuickStatsBar } from '@/components/home/QuickStatsBar';
import { QuickActionsRow } from '@/components/home/QuickActionsRow';
import { CategoryGrid } from '@/components/home/CategoryGrid';
import { PopularDoctors } from '@/components/home/PopularDoctors';
import { TrendingHospitals } from '@/components/home/TrendingHospitals';
import { SymptomQuickAccess } from '@/components/home/SymptomQuickAccess';
import { HealthArticles } from '@/components/home/HealthArticles';
import { CommunityQATeaser } from '@/components/home/CommunityQATeaser';
import { BloodServicesCTA } from '@/components/home/BloodServicesCTA';

/**
 * Homepage Section Registry — VYTANEXA-BLUEPRINT.md § S04
 * "Admin Section Control" and ADMIN-PANEL-SPEC.md § A07.
 *
 * `SECTION_COMPONENTS` maps the exact section `id` values the Admin
 * Panel's drag-drop UI writes into `app_settings.homepage_settings`
 * to the actual React component that renders it — this is the live
 * end of the god-mode contract the spec describes.
 *
 * `DEFAULT_SECTIONS` mirrors the exact default array shown in S04's
 * spec verbatim. It's used as a fallback when `homepage_settings.
 * sections` is empty (the as-shipped default, before an admin has
 * customized anything via A07) — NOT written back to the database,
 * since doing so would be writing structural config as if it were
 * admin-authored data, which isn't this code's place to decide.
 */
// React's built-in `ComponentType` doesn't model async Server
// Components (which return `Promise<ReactElement | null>`, not a
// synchronous element) — this is a known gap in @types/react as of
// this writing. A minimal type that matches what these components
// actually are avoids either a false type error or an unjustified
// `any`/suppression.
type ServerComponent = () => Promise<ReactElement | null> | ReactElement | null;

export const SECTION_COMPONENTS: Record<string, ServerComponent> = {
  announcement: AnnouncementBanner,
  hero_slider: HeroBannerSlider,
  quick_stats: QuickStatsBar,
  quick_actions: QuickActionsRow,
  categories: CategoryGrid,
  popular_docs: PopularDoctors,
  hospitals: TrendingHospitals,
  symptoms: SymptomQuickAccess,
  articles: HealthArticles,
  qa_teaser: CommunityQATeaser,
  blood_cta: BloodServicesCTA,
};

export type HomepageSectionConfig = {
  id: string;
  visible: boolean;
  order: number;
};

export const DEFAULT_SECTIONS: HomepageSectionConfig[] = [
  { id: 'announcement', visible: true, order: 1 },
  { id: 'hero_slider', visible: true, order: 2 },
  { id: 'quick_stats', visible: true, order: 3 },
  { id: 'quick_actions', visible: true, order: 4 },
  { id: 'categories', visible: true, order: 5 },
  { id: 'popular_docs', visible: true, order: 6 },
  { id: 'hospitals', visible: true, order: 7 },
  { id: 'symptoms', visible: true, order: 8 },
  { id: 'articles', visible: false, order: 9 },
  { id: 'qa_teaser', visible: false, order: 10 },
  { id: 'blood_cta', visible: true, order: 11 },
];

/** Resolves the effective, ordered, visible section list for rendering. */
export function resolveHomepageSections(
  stored: HomepageSectionConfig[] | null | undefined
): HomepageSectionConfig[] {
  const source = stored && stored.length > 0 ? stored : DEFAULT_SECTIONS;
  return [...source]
    .filter((s) => s.visible && SECTION_COMPONENTS[s.id])
    .sort((a, b) => a.order - b.order);
}
