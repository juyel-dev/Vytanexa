'use client';

import { useEffect } from 'react';

/**
 * Dashboard Error Boundary — TODO.md Phase 8.6 / DEEPDIVE-REFACTOR-PLAN.md
 * H4. Same layout-scoped coverage as loading.tsx in this directory —
 * one file for all 33 dashboard routes. Before this, an unhandled
 * error in any dashboard Server Component fell through to Next's
 * default unstyled error screen with no way back into the app except
 * a manual URL edit; this keeps the sidebar/TopBar chrome visible
 * (rendered by the layout, outside this boundary) and offers both a
 * retry and a way back to the dashboard home.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin dashboard route error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-xl border border-admin-border bg-white px-6 py-12 text-center">
      <p className="text-3xl" aria-hidden>
        ⚠️
      </p>
      <h1 className="mt-3 text-admin-h2 text-neutral-900">কিছু ভুল হয়েছে</h1>
      <p className="mt-1 max-w-[36ch] text-admin-body text-neutral-500">
        এই পেজটি লোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন, অথবা ড্যাশবোর্ডে ফিরে যান।
      </p>
      <div className="mt-6 flex gap-2">
        <button
          onClick={reset}
          className="h-10 rounded-md bg-brand-600 px-5 text-admin-body font-semibold text-white hover:bg-brand-700"
        >
          আবার চেষ্টা করুন
        </button>
        <a
          href="/"
          className="flex h-10 items-center rounded-md border border-admin-border bg-white px-5 text-admin-body font-medium text-neutral-700 hover:bg-neutral-50"
        >
          ড্যাশবোর্ড হোম
        </a>
      </div>
      {error.digest && <p className="mt-4 text-admin-small text-neutral-400">ref: {error.digest}</p>}
    </div>
  );
}
