'use client';

import { useEffect } from 'react';
import { useT } from '@vytanexa/i18n/client';

/**
 * Global Error Boundary — S01 §11 a11y + Cross-cutting TODO.
 * Next.js App Router convention: src/app/error.tsx catches rendering
 * errors for its segment. Root level here covers (main)/(auth)/(seo).
 * The `reset()` callback re-attempts rendering the segment — exposed as
 * the "আবার চেষ্টা করুন" button per the three-state pattern (loading/
 * error/empty) that every async list/card already handles, but at the
 * route level this was previously missing entirely (audit: 0 error.tsx
 * found). Styling matches the spec's neutral-50 card + brand CTA.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Route error:', error);
  }, [error]);
  const t = useT('common');

  return (
    <div className="flex min-h-[50dvh] flex-col items-center justify-center px-6 py-12 text-center">
      <p className="text-3xl" aria-hidden>
        ⚠️
      </p>
      <h1 className="mt-3 text-[17px] font-bold text-neutral-900">{t('error')}</h1>
      <p className="mt-1 max-w-[28ch] text-[14px] leading-6 text-neutral-500">
        {t('pageErrorBody')}
      </p>
      <button
        onClick={reset}
        className="mt-6 h-11 rounded-md bg-brand-600 px-6 text-[14px] font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        {t('retry')}
      </button>
      {error.digest && <p className="mt-3 text-[11px] text-neutral-400">ref: {error.digest}</p>}
    </div>
  );
}
