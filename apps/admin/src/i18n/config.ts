// ADMIN-PANEL-SPEC.md § A02 — admin chrome is authored in Bengali
// (every spec mockup's nav map, dashboard, and toggle labels are
// Bengali), and the sole operator is Bengali-speaking, so the admin
// panel ships Bengali-only rather than fabricating en/hi translations.
// Cookie-based (no URL prefix) per the shared i18n decision.

export const locales = ['bn'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'bn';

export function isValidLocale(v: string | undefined | null): v is Locale {
  return locales.includes(v as Locale);
}