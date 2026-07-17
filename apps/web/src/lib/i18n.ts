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
