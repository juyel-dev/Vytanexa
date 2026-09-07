'use client';

/** Client-Component hook equivalents of `lib/i18n.ts` — mirrors
 *  `apps/web/src/lib/i18n-client.ts`. See that file's doc comment. */
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

export function useLocalizedField(translations: Json | null | undefined): string {
  return _useLocalizedField(translations);
}

export function useLocalizedArray(translations: Json | null | undefined): string[] {
  return _useLocalizedArray(translations);
}

export function useFormatter() {
  return _useFormatter();
}
