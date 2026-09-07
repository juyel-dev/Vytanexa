'use client';

/**
 * App-specific, pre-bound client i18n hooks — hook equivalents of
 * `lib/i18n.ts`'s server functions, for Client-Component call sites that
 * can't read `cookies()` (I18N-ARCHITECTURE.md § 4). Locale comes from
 * `<I18nProvider>` (mounted in `app/layout.tsx`) via React Context.
 *
 * `useLocalizedField`/`useLocalizedArray` return a plain function, not a
 * resolved value directly — call the hook once per component
 * (`const localize = useLocalizedField();`), then call the function it
 * returns as many times as needed, including inside `.map()` — see
 * `@vytanexa/i18n/client`'s doc comment on why this shape, not
 * `useLocalizedField(translations)` directly, is required for correctness
 * with list rendering.
 */
export {
  useFormatter,
  useLocalizedArray,
  useLocalizedField,
} from '@vytanexa/i18n/client';
export { LANGUAGE_NAMES, LANGUAGE_OPTIONS, SPOKEN_LANGUAGE_LABELS, toBengaliDigits, formatRelativeTimeBn } from './i18n-shared';

import { useResolvedLocale as _useResolvedLocale } from '@vytanexa/i18n/client';
import type { Locale } from '@/i18n/config';

export function useResolvedLocale(): Locale {
  return _useResolvedLocale<Locale>();
}
