/**
 * Reads a `*_translations` JSONB field (DATABASE-SCHEMA.md convention,
 * every content table) with the fallback chain specified in
 * VYTANEXA-BLUEPRINT.md § S22 "i18n Implementation":
 * requested locale → 'bn' (default) → 'en' → first available key.
 * Guarantees no blank text ever renders, even for records that don't
 * yet have every language filled in by the admin.
 */
import type { Json } from '@vytanexa/database';

/**
 * Reads a `*_translations` JSONB field (DATABASE-SCHEMA.md convention,
 * every content table) with the fallback chain specified in
 * VYTANEXA-BLUEPRINT.md § S22 "i18n Implementation":
 * requested locale → 'bn' (default) → 'en' → first available key.
 * Guarantees no blank text ever renders, even for records that don't
 * yet have every language filled in by the admin.
 *
 * Accepts the raw Supabase `Json` type directly (rather than requiring
 * every call site to cast JSONB columns to `Record<string, string>`)
 * and narrows it safely at runtime — malformed/unexpected JSON shapes
 * degrade to an empty string instead of throwing.
 */
export function getLocalizedField(translations: Json | null | undefined, locale: string = 'bn'): string {
  if (
    !translations ||
    typeof translations !== 'object' ||
    Array.isArray(translations)
  ) {
    return '';
  }

  const record = translations as Record<string, Json>;
  if (typeof record[locale] === 'string') return record[locale];
  if (typeof record.bn === 'string') return record.bn;
  if (typeof record.en === 'string') return record.en;

  const firstValue = Object.values(record).find((v) => typeof v === 'string');
  return typeof firstValue === 'string' ? firstValue : '';
}

/**
 * Reads a JSONB *array* of per-locale translation objects — the
 * pluralized variant of the `*_translations` convention used for list
 * fields (e.g. `symptoms.common_causes_translations`:
 * `[{"bn": "...", "en": "..."}, ...]`, migration 0011). Malformed/
 * non-array input degrades to an empty array rather than throwing,
 * same defensive posture as `getLocalizedField`.
 */
export function getLocalizedArray(translations: Json | null | undefined, locale: string = 'bn'): string[] {
  if (!Array.isArray(translations)) return [];
  return translations
    .map((item) => getLocalizedField(item as Json, locale))
    .filter((s) => s.length > 0);
}

const BN_DIGITS: Record<string, string> = {
  '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
  '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯',
};

/** Converts ASCII digits in a string to Bengali digits. */
export function toBengaliDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => BN_DIGITS[d] ?? d);
}

/**
 * Relative time in Bengali (VYTANEXA-BLUEPRINT.md § S13's article meta
 * line: "৩ মিনিট পড়া · ২ দিন আগে"). Falls back to an absolute Bengali
 * date once the gap exceeds 30 days — a relative label like "২ মাস
 * আগে" is less useful past that point than just the date.
 */
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

  return new Date(isoDate).toLocaleDateString('bn-BD', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
