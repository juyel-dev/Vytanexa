/**
 * App-specific, pre-bound server i18n helpers — thin wrappers around
 * `@vytanexa/i18n/server`, closed over `localeConfig` (apps/web/src/i18n/
 * config.ts) so call sites don't repeat it. See I18N-ARCHITECTURE.md § 4.
 *
 * `getLocalizedField` / `getLocalizedArray` keep the EXACT same name and
 * single-argument call signature every existing Server-Component call site
 * already uses (`getLocalizedField(doctor.name_translations)`) — this file
 * is the fix for the bug documented in I18N-ARCHITECTURE.md: previously
 * this function silently defaulted to `'bn'` at all 40 call sites; it now
 * resolves the real request locale. Server-Component call sites needed
 * zero changes. Client-Component call sites use `useLocalizedField` from
 * `./i18n-client` instead — this module is transitively `server-only`
 * (via `@vytanexa/i18n/server`) and MUST NOT be imported from any
 * `'use client'` file, including for its non-locale exports; see
 * `./i18n-shared.ts` for the pure helpers that are safe in either bundle.
 */
import type { Json } from '@vytanexa/i18n';
import {
  getFormatter as _getFormatter,
  getLocalizedArray as _getLocalizedArray,
  getLocalizedField as _getLocalizedField,
  getResolvedLocale as _getResolvedLocale,
} from '@vytanexa/i18n/server';
import { localeConfig, type Locale } from '@/i18n/config';

export { LANGUAGE_NAMES, LANGUAGE_OPTIONS, SPOKEN_LANGUAGE_LABELS, toBengaliDigits, formatRelativeTimeBn } from './i18n-shared';

export function getResolvedLocale(): Locale {
  return _getResolvedLocale(localeConfig);
}

export function getLocalizedField(translations: Json | null | undefined): string {
  return _getLocalizedField(translations, localeConfig);
}

export function getLocalizedArray(translations: Json | null | undefined): string[] {
  return _getLocalizedArray(translations, localeConfig);
}

export function getFormatter() {
  return _getFormatter(localeConfig);
}
