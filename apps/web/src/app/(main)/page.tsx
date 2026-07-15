import { TopBarHome } from '@/components/layout/TopBar';

export default function Home() {
  return (
    <>
      <TopBarHome />
      <main className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-bold text-white shadow-brand">
          V
        </div>
        <h1 className="font-bengali-display text-2xl font-bold text-neutral-900">
          Vytanexa
        </h1>
        <p className="font-bengali-body text-sm text-neutral-500">
          আপনার স্বাস্থ্য, আপনার সংযোগ — শীঘ্রই আসছে
        </p>
        <p className="mt-4 text-xs text-neutral-400">
          Phase 2 — app shell wired · see IMPLEMENTATION-ROADMAP.md
        </p>
      </main>
    </>
  );
}
