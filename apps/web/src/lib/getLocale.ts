import { cookies } from 'next/headers';
import type { Locale } from '@/i18n/config';
import { defaultLocale, isValidLocale } from '@/i18n/config';

/**
 * Server helper — reads the cookie-based locale set by onboarding's
 * LanguageStep and settings' LanguageSheet. Identical precedence as
 * i18n/request.ts (cookie → default). Use inside Server Components to
 * thread the resolved locale into `getLocalizedField(translations, locale)`.
 * Client components should read `document.cookie` or pass locale as a prop
 * from their parent Server Component rather than importing this directly.
 */
export function getLocale(): Locale {
  try {
    const raw = cookies().get('locale')?.value;
    return isValidLocale(raw) ? raw : defaultLocale;
  } catch {
    return defaultLocale;
  }
}
