import type { LocaleConfig } from '@vytanexa/i18n';

// Cookie-based locale (no URL prefix). English is the first-run default;
// users can still switch to Bengali or Hindi later from Settings.
export const localeConfig = {
  locales: ['bn', 'en', 'hi'],
  defaultLocale: 'en',
  intlLocale: { bn: 'bn-IN', en: 'en-IN', hi: 'hi-IN' },
  currency: 'INR',
} as const satisfies LocaleConfig<'bn' | 'en' | 'hi'>;

export type Locale = (typeof localeConfig.locales)[number];
export const locales = localeConfig.locales;
export const defaultLocale: Locale = localeConfig.defaultLocale;

export function isValidLocale(v: string | undefined | null): v is Locale {
  return (locales as readonly string[]).includes(v ?? '');
}
