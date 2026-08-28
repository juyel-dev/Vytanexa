// VYTANEXA-BLUEPRINT.md § S22 — cookie-based locale (no URL prefix).
// Mirrors § S02 §7: next-intl locale read from `locale` cookie, same
// URL serves all languages. Default: bn.

export const locales = ['bn', 'en', 'hi'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'bn';

export function isValidLocale(v: string | undefined | null): v is Locale {
  return locales.includes(v as Locale);
}
