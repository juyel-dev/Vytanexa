import type { LocaleConfig } from '@vytanexa/i18n';

// ADMIN-PANEL-SPEC.md § A02 — admin chrome is authored in Bengali (every
// spec mockup's nav map, dashboard, and toggle labels are Bengali), and the
// sole operator is Bengali-speaking, so the admin panel ships Bengali-only
// rather than fabricating en/hi translations. Cookie-based (no URL prefix)
// per the shared i18n decision.
//
// Shares @vytanexa/i18n with apps/web for consistency and future-proofing
// (see I18N-ARCHITECTURE.md § 10) — not because admin needs multiple
// languages today. Adding one is a one-line change to `locales` below,
// with zero component-level changes required.
export const localeConfig = {
  locales: ['bn'],
  defaultLocale: 'bn',
  intlLocale: { bn: 'bn-IN' },
  currency: 'INR',
} as const satisfies LocaleConfig<'bn'>;

export type Locale = (typeof localeConfig.locales)[number];
export const locales = localeConfig.locales;
export const defaultLocale: Locale = localeConfig.defaultLocale;

export function isValidLocale(v: string | undefined | null): v is Locale {
  return (locales as readonly string[]).includes(v ?? '');
}
