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
 * resolves the real request locale, with no call-site changes required for
 * the ~17 that are Server Components (I18N-IMPLEMENTATION-SPEC.md § 12
 * Phase 2 handles the ~23 Client-Component sites, which need
 * `useLocalizedField` from `./i18n-client` instead).
 */
import type { Json } from '@vytanexa/i18n';
import {
  getFormatter as _getFormatter,
  getLocalizedArray as _getLocalizedArray,
  getLocalizedField as _getLocalizedField,
  getResolvedLocale as _getResolvedLocale,
} from '@vytanexa/i18n/server';
import { localeConfig, type Locale } from '@/i18n/config';

/**
 * TODO.md Phase 9.2: extracted from SettingsClient.tsx when
 * MorePageClient.tsx needed the same map (its "ভাষা" preview value
 * was hardcoded to "বাংলা" regardless of the user's actual
 * preferred_language — this is the fix). The only three values
 * preferred_language is ever written as, per
 * onboarding/LanguageStep.tsx and validations/account.ts's Zod schema.
 *
 * Still hand-maintained here (not yet folded into common.json) —
 * I18N-IMPLEMENTATION-SPEC.md § 11 tracks consolidating this with the two
 * other UI-locale-label duplicates as Phase 2 work, done together with the
 * Client-Component call-site migration above.
 */
export const LANGUAGE_NAMES: Record<string, string> = { bn: 'বাংলা', en: 'English', hi: 'हिन्दी' };

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

// --- Deprecated: use getFormatter() instead -------------------------------
// Kept working, not deleted, until their ~14 call sites are migrated
// (I18N-IMPLEMENTATION-SPEC.md § 12 Phase 4) — deleting them now would
// break rendering everywhere that isn't touched in this pass.

const BN_DIGITS: Record<string, string> = {
  '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
  '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯',
};

/** @deprecated Use `getFormatter().number()` — correctly locale-aware
 *  (works for en/hi too) and gives correct Indian digit grouping, which
 *  this hand-written version never did. */
export function toBengaliDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => BN_DIGITS[d] ?? d);
}

/** @deprecated Use `getFormatter().relativeTime()` — locale-aware
 *  (works for en/hi too), same second/minute/hour/day/month bucket
 *  cascade as this function, on top of native `Intl.RelativeTimeFormat`. */
export function formatRelativeTimeBn(isoDate: string): string {
  const then = new Date(isoDate).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));

  if (diffSec < 60) return 'এইমাত্র';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${toBengaliDigits(diffMin)} মিনিট আগে`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${toBengaliDigits(diffHour)} ঘণ্টা আগে`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${toBengaliDigits(diffDay)} দিন আগে`;

  // Bug fix in passing: was 'bn-BD' (Bangladesh Bengali) in an India-market
  // app — see I18N-ARCHITECTURE.md § 1 correction. Harmless in practice
  // (month/day names are near-identical) but wrong, and free to fix while
  // this line is already being touched.
  return new Date(isoDate).toLocaleDateString('bn-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
