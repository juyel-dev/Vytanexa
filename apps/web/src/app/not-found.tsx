import Link from 'next/link';
import { getT } from '@vytanexa/i18n/server';

/**
 * Global Not Found — rendered when `notFound()` is called (e.g.
 * doctor slug not found, custom page not published, SEO combo with
 * zero doctors). Previously relied on Next's default 404 page with no
 * brand chrome; now provides a branded fallback with a clear CTA back
 * to discovery.
 */
export default async function NotFound() {
  const t = await getT('common');
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center px-6 py-12 text-center">
      <p className="text-4xl" aria-hidden>
        🔍
      </p>
      <h1 className="mt-3 text-[18px] font-bold text-neutral-900">{t('notFoundHeading')}</h1>
      <p className="mt-1 max-w-[28ch] text-[14px] leading-6 text-neutral-500">
        {t('notFoundBody')}
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-11 items-center rounded-md bg-brand-600 px-6 text-[14px] font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        {t('backToHome')}
      </Link>
    </div>
  );
}
