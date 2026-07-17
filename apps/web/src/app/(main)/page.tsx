import { TopBarHome } from '@/components/layout/TopBar';
import { LocationChip } from '@/components/layout/LocationChip';
import { Footer } from '@/components/layout/Footer';
import { NativeAd } from '@/components/home/NativeAd';
import { PwaInstallBanner } from '@/components/home/PwaInstallBanner';
import { createClient } from '@/lib/supabase/server';
import {
  SECTION_COMPONENTS,
  resolveHomepageSections,
  type HomepageSectionConfig,
} from '@/lib/homepage-sections';

// NOTE on caching: this page is dynamically rendered per-request, not
// ISR-cached, because the Supabase server client (lib/supabase/server.ts)
// reads cookies() for future auth-aware personalization -- Next.js
// forces dynamic rendering whenever a Server Component touches
// cookies(), which overrides any `revalidate` export. S04's "5 min ISR"
// target is a later optimization (splitting cookie-dependent bits from
// cacheable ones) rather than something to fake with a config that
// wouldn't actually take effect -- documenting the real behavior here
// instead of a misleading revalidate export.

export default async function Home() {
  const supabase = createClient();
  const { data: settings } = await supabase
    .from('app_settings')
    .select('homepage_settings')
    .eq('id', 1)
    .single();

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
            <>
              <SectionComponent key={section.id} />
              {/* Native Ad interspersed after "popular_docs" per S04's
                  wireframe (SEC-06 → SEC-07) — not an admin-toggleable
                  section itself, matches the spec's "between content"
                  placement rather than the drag-drop-orderable list. */}
              {section.id === 'popular_docs' && <NativeAd key={`${section.id}-ad`} />}
            </>
          );
        })}

        <PwaInstallBanner />
      </main>
      <Footer />
    </>
  );
}
