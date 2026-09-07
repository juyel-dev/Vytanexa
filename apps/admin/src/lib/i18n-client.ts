'use client';

/** Client-Component hook equivalents of `lib/i18n.ts` — mirrors
 *  `apps/web/src/lib/i18n-client.ts`. See that file's doc comment,
 *  especially on why `useLocalizedField`/`useLocalizedArray` return a
 *  function rather than a resolved value. */
export {
  useFormatter,
  useLocalizedArray,
  useLocalizedField,
} from '@vytanexa/i18n/client';

import { useResolvedLocale as _useResolvedLocale } from '@vytanexa/i18n/client';
import type { Locale } from '@/i18n/config';

export function useResolvedLocale(): Locale {
  return _useResolvedLocale<Locale>();
}
