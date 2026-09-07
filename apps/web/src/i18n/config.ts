import type { LocaleConfig } from '@vytanexa/i18n';

// VYTANEXA-BLUEPRINT.md § S22 — cookie-based locale (no URL prefix).
// Mirrors § S02 §7: next-intl locale read from `locale` cookie, same
// URL serves all languages. Default: bn.
//
// Single source of truth for the web app's supported locales — consumed by
// @vytanexa/i18n/server + /client (via lib/i18n.ts and lib/i18n-client.ts)
// and by i18n/request.ts. See I18N-ARCHITECTURE.md § 1 "Market: India" for
// why intlLocale/currency are what they are.
export const localeConfig = {
  locales: ['bn', 'en', 'hi'],
  defaultLocale: 'bn',
  intlLocale: { bn: 'bn-IN', en: 'en-IN', hi: 'hi-IN' },
  currency: 'INR',
} as const satisfies LocaleConfig<'bn' | 'en' | 'hi'>;

export type Locale = (typeof localeConfig.locales)[number];
export const locales = localeConfig.locales;
export const defaultLocale: Locale = localeConfig.defaultLocale;

export function isValidLocale(v: string | undefined | null): v is Locale {
  return (locales as readonly string[]).includes(v ?? '');
}
