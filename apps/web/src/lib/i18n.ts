/**
 * Reads a `*_translations` JSONB field (DATABASE-SCHEMA.md convention,
 * every content table) with the fallback chain specified in
 * VYTANEXA-BLUEPRINT.md § S22 "i18n Implementation":
 * requested locale → 'bn' (default) → 'en' → first available key.
 * Guarantees no blank text ever renders, even for records that don't
 * yet have every language filled in by the admin.
 */
export function getLocalizedField(
  translations: Record<string, string> | null | undefined,
  locale: string = 'bn'
): string {
  if (!translations) return '';
  if (translations[locale]) return translations[locale];
  if (translations.bn) return translations.bn;
  if (translations.en) return translations.en;
  const firstKey = Object.keys(translations)[0];
  return firstKey ? translations[firstKey]! : '';
}
