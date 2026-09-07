import type { Json, LocaleConfig } from './types';

/**
 * Core fallback chain for `*_translations` JSONB fields
 * (VYTANEXA-BLUEPRINT.md § S22 "i18n Implementation", unchanged from the
 * original design — it was already correct):
 *
 *   requested locale → config.defaultLocale → 'en' → first available key → ''
 *
 * Pure function, no I/O — shared verbatim by `server.ts` (locale resolved
 * from the request cookie) and `client.tsx` (locale resolved from
 * `<I18nProvider>` context) so the two call paths can never disagree about
 * how fallback works, only about *where the locale itself came from*.
 *
 * Guarantees no blank text ever renders, even for records that don't yet
 * have every language filled in by the admin.
 */
export function resolveLocalizedField(
  translations: Json | null | undefined,
  locale: string,
  config: LocaleConfig,
): string {
  if (!translations || typeof translations !== 'object' || Array.isArray(translations)) {
    return '';
  }

  const record = translations as Record<string, Json | undefined>;
  if (typeof record[locale] === 'string') return record[locale] as string;
  if (typeof record[config.defaultLocale] === 'string') return record[config.defaultLocale] as string;
  if (typeof record.en === 'string') return record.en;

  const first = Object.values(record).find((v) => typeof v === 'string');
  return typeof first === 'string' ? first : '';
}

/**
 * Array variant — the pluralized `*_translations` convention used for list
 * fields (e.g. `symptoms.common_causes_translations`:
 * `[{"bn": "...", "en": "..."}, ...]`, migration 0011). Malformed/non-array
 * input degrades to an empty array rather than throwing.
 */
export function resolveLocalizedArray(
  translations: Json | null | undefined,
  locale: string,
  config: LocaleConfig,
): string[] {
  if (!Array.isArray(translations)) return [];
  return translations
    .map((item) => resolveLocalizedField(item as Json, locale, config))
    .filter((s) => s.length > 0);
}

/** Narrows a raw (possibly missing/invalid) locale string against the app's
 *  configured locale set, falling back to `config.defaultLocale`. */
export function resolveLocale<L extends string>(
  raw: string | undefined,
  config: LocaleConfig<L>,
): L {
  return (config.locales as readonly string[]).includes(raw ?? '') ? (raw as L) : config.defaultLocale;
}
