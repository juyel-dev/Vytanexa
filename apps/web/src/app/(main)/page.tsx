import { TopBarHome } from '@/components/layout/TopBar';
import { LocationChip } from '@/components/layout/LocationChip';
import { Footer } from '@/components/layout/Footer';
import { NativeAd } from '@/components/home/NativeAd';
import { PwaInstallBanner } from '@/components/home/PwaInstallBanner';
import { Fragment, Suspense } from 'react';
import { getPublicAppSettings } from '@/lib/app-settings';
import {
  SECTION_COMPONENTS,
  resolveHomepageSections,
  type HomepageSectionConfig,
} from '@/lib/homepage-sections';

// Caching/perf: the page stays dynamic (locale + auth live in cookies),
// but every public read goes through lib/supabase/public.ts (Next Data
// Cache, 5 min) and app_settings is read once per request via
// getPublicAppSettings(). Each section streams in its own <Suspense>
// so the shell paints without waiting for the slowest query.

export default async function Home() {
  const settings = await getPublicAppSettings();

  const storedSections = (
    settings?.homepage_settings as { sections?: HomepageSectionConfig[] } | null
  )?.sections;
  const sections = resolveHomepageSections(storedSections);

  return (
    <>
      <TopBarHome />
      <main>
        <LocationChip />

        {sections.map((section) => {
          const SectionComponent = SECTION_COMPONENTS[section.id]!;
          return (
            <Fragment key={section.id}>
              <Suspense fallback={<div className="h-24 animate-pulse bg-neutral-50" aria-hidden />}>
                <SectionComponent />
              </Suspense>
              {/* Native Ad interspersed after "popular_docs" per S04's
                  wireframe (SEC-06 → SEC-07) — not an admin-toggleable
                  section itself, matches the spec's "between content"
                  placement rather than the drag-drop-orderable list. */}
              {section.id === 'popular_docs' && (
                <Suspense fallback={null}>
                  <NativeAd />
                </Suspense>
              )}
            </Fragment>
          );
        })}

        <PwaInstallBanner />
      </main>
      <Footer />
    </>
  );
}
