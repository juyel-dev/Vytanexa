'use client';

import { useEffect } from 'react';

/**
 * (main) group error — finer-grained than the root error.tsx so a
 * failure in Home/Search/Doctors doesn't replace the entire app shell
 * (root layout fonts/provider remain mounted). Same UI as the global
 * boundary for visual consistency.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('(main) error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[40dvh] flex-col items-center justify-center px-6 py-10 text-center">
      <h1 className="text-[16px] font-bold text-neutral-900">কিছু ভুল হয়েছে</h1>
      <p className="mt-1 text-[14px] text-neutral-500">পৃষ্ঠাটি লোড করতে সমস্যা হয়েছে।</p>
      <button
        onClick={reset}
        className="mt-5 h-10 rounded-md bg-brand-600 px-5 text-[14px] font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        আবার চেষ্টা করুন
      </button>
    </div>
  );
}
