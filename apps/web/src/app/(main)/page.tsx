import { TopBarHome } from '@/components/layout/TopBar';
import { QuickActionsRow } from '@/components/home/QuickActionsRow';
import { CategoryGrid } from '@/components/home/CategoryGrid';
import { QuickStatsBar } from '@/components/home/QuickStatsBar';

// NOTE on caching: this page is dynamically rendered per-request, not
// ISR-cached, because the Supabase server client (lib/supabase/server.ts)
// reads cookies() for future auth-aware personalization -- Next.js
// forces dynamic rendering whenever a Server Component touches
// cookies(), which overrides any `revalidate` export. S04's "5 min ISR"
// target is a later optimization (splitting cookie-dependent bits from
// cacheable ones) rather than something to fake with a config that
// wouldn't actually take effect -- documenting the real behavior here
// instead of a misleading revalidate export.

export default function Home() {
  return (
    <>
      <TopBarHome />
      <main>
        {/* Location chip (S04) intentionally deferred — needs the
            Location Picker sheet (S03/S02) built first, which needs
            real location data in the DB to be meaningful. Sections
            below are ordered per S04's default order; admin-controlled
            reordering (app_settings.homepage_settings) wires in once
            the Admin Panel's Homepage Section Control (A07) exists. */}
        <QuickStatsBar />
        <QuickActionsRow />
        <CategoryGrid />

        <div className="px-6 py-10 text-center text-xs text-neutral-400">
          বাকি সেকশন (Popular Doctors, Hospitals, Symptoms...) পরবর্তী ধাপে
          <br />
          see IMPLEMENTATION-ROADMAP.md
        </div>
      </main>
    </>
  );
}
