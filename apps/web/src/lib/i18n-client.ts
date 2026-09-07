'use client';

/**
 * App-specific, pre-bound client i18n hooks — hook equivalents of
 * `lib/i18n.ts`'s server functions, for the ~23 Client-Component call
 * sites that can't read `cookies()` (I18N-ARCHITECTURE.md § 4). Locale
 * comes from `<I18nProvider>` (mounted in `app/layout.tsx`) via React
 * Context, not from a repeated `localeConfig` argument.
 */
import type { Json } from '@vytanexa/i18n';
import {
  useFormatter as _useFormatter,
  useLocalizedArray as _useLocalizedArray,
  useLocalizedField as _useLocalizedField,
  useResolvedLocale as _useResolvedLocale,
} from '@vytanexa/i18n/client';
import type { Locale } from '@/i18n/config';

export function useResolvedLocale(): Locale {
  return _useResolvedLocale<Locale>();
}

/** Client-Component equivalent of `getLocalizedField` from `./i18n`. */
export function useLocalizedField(translations: Json | null | undefined): string {
  return _useLocalizedField(translations);
}

/** Client-Component equivalent of `getLocalizedArray` from `./i18n`. */
export function useLocalizedArray(translations: Json | null | undefined): string[] {
  return _useLocalizedArray(translations);
}

/** Client-Component equivalent of `getFormatter` from `./i18n`. */
export function useFormatter() {
  return _useFormatter();
}
