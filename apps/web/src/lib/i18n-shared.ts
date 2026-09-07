/**
 * Pure, environment-agnostic i18n helpers — deliberately kept OUT of
 * `lib/i18n.ts`. That file imports `@vytanexa/i18n/server`, which carries
 * a `server-only` guard; because bundlers apply `server-only`'s
 * browser-field substitution at the whole-module level (not per export),
 * ANY named import from `lib/i18n.ts` — even a pure function that never
 * touches `cookies()`, like `toBengaliDigits` — would make a Client
 * Component's bundle fail. `tsc --noEmit` cannot catch this class of
 * error (it's a bundler-time check); it was only found by manually
 * tracing every Client-Component importer during Phase 2, since this
 * sandbox's network restrictions block `next build`'s font-fetching step
 * before webpack gets far enough to surface it directly — see
 * I18N-IMPLEMENTATION-SPEC.md § 12 Phase 2 for the full account.
 *
 * `lib/i18n.ts` (server) and `lib/i18n-client.ts` (client) both re-export
 * everything here, so existing imports from either keep working — this
 * file exists to fix *where the implementation lives*, not to introduce
 * a third import path callers need to know about.
 */

/**
 * TODO.md Phase 9.2 / I18N-IMPLEMENTATION-SPEC.md § 11: single source for
 * the app's three locale display labels — previously duplicated across
 * `onboarding/LanguageStep.tsx` and `settings/LanguageSheet.tsx` (both had
 * their own, byte-for-byte identical `LANGUAGES` array). Both now import
 * this. The only three values `preferred_language` is ever written as,
 * per `validations/account.ts`'s Zod schema.
 */
export const LANGUAGE_OPTIONS: { code: 'bn' | 'en' | 'hi'; native: string; english: string }[] = [
  { code: 'bn', native: 'বাংলা', english: 'Bengali' },
  { code: 'en', native: 'English', english: 'English' },
  { code: 'hi', native: 'हिन्दी', english: 'Hindi' },
];

/** Lookup-map form of `LANGUAGE_OPTIONS`, for call sites that just want
 *  "what's the native name for this code" (e.g. a settings row preview)
 *  rather than iterating the full list. Derived, not hand-duplicated. */
export const LANGUAGE_NAMES: Record<string, string> = Object.fromEntries(
  LANGUAGE_OPTIONS.map((l) => [l.code, l.native]),
);

/**
 * A DIFFERENT concept from `LANGUAGE_OPTIONS`/`LANGUAGE_NAMES` above —
 * which human languages a *doctor speaks* (`doctors.languages_spoken`),
 * not the app's UI language — even though the value set happens to
 * overlap `bn`/`en`/`hi` today. Deliberately NOT merged with
 * `LANGUAGE_NAMES` (I18N-IMPLEMENTATION-SPEC.md § 11): the day a doctor
 * who speaks Urdu is onboarded, this list needs a 4th entry that will
 * never be a valid app UI locale, and conflating the two would make that
 * an awkward, surprising change instead of an obvious one.
 *
 * Was three separate, slightly-differently-shaped copies before this
 * fold-in: a ternary in `doctor-profile/DoctorProfileClient.tsx`, a
 * near-identical ternary in `doctor-profile/InfoTab.tsx`, and a
 * `{code, label}[]` array in `doctors/FilterSheet.tsx`.
 */
export const SPOKEN_LANGUAGE_LABELS: Record<string, string> = { bn: 'বাংলা', en: 'English', hi: 'हिन्दी' };

// --- Deprecated: use getFormatter()/useFormatter() instead ----------------
// Kept working, not deleted, until their call sites are migrated
// (I18N-IMPLEMENTATION-SPEC.md § 12 Phase 4) — deleting them now would
// break rendering everywhere that isn't touched in this pass.

const BN_DIGITS: Record<string, string> = {
  '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
  '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯',
};

/** @deprecated Use `getFormatter().number()` / `useFormatter().number()`
 *  — correctly locale-aware (works for en/hi too) and gives correct
 *  Indian digit grouping, which this hand-written version never did. */
export function toBengaliDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => BN_DIGITS[d] ?? d);
}

/** @deprecated Use `getFormatter().relativeTime()` /
 *  `useFormatter().relativeTime()` — locale-aware (works for en/hi too),
 *  same second/minute/hour/day/month bucket cascade as this function, on
 *  top of native `Intl.RelativeTimeFormat`. */
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
  // app — see I18N-ARCHITECTURE.md § 1 correction.
  return new Date(isoDate).toLocaleDateString('bn-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
