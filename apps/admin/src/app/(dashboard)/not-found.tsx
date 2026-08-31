import Link from 'next/link';

/**
 * Dashboard Not Found — TODO.md Phase 8.6 / DEEPDIVE-REFACTOR-PLAN.md
 * H4. Same layout-scoped coverage as loading.tsx / error.tsx in this
 * directory. Triggers on an explicit `notFound()` call (e.g. editing
 * a doctor/hospital/article id that was deleted from another tab) or
 * a genuinely unmatched dashboard sub-route.
 */
export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-xl border border-admin-border bg-white px-6 py-12 text-center">
      <p className="text-4xl" aria-hidden>
        🔍
      </p>
      <h1 className="mt-3 text-admin-h2 text-neutral-900">পাওয়া যায়নি</h1>
      <p className="mt-1 max-w-[36ch] text-admin-body text-neutral-500">
        এই রেকর্ড বা পেজটি খুঁজে পাওয়া যায়নি — হয়তো অন্য কোথাও থেকে মুছে ফেলা হয়েছে।
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-10 items-center rounded-md bg-brand-600 px-5 text-admin-body font-semibold text-white hover:bg-brand-700"
      >
        ড্যাশবোর্ড হোম
      </Link>
    </div>
  );
}
