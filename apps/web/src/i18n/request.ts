import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { defaultLocale, isValidLocale, type Locale } from './config';

// One entry per apps/web/messages/{locale}/<namespace>.json file. Add a
// line here when a new namespace is created (I18N-IMPLEMENTATION-SPEC.md
// § 7) — intentionally explicit rather than a filesystem glob, so "what
// messages does this app ship" is always visible in one place instead of
// discovered at request time.
const NAMESPACES = ['common', 'nav', 'onboarding', 'home', 'doctor', 'settings', 'offline', 'articles', 'hospital', 'shared', 'reviews', 'location'] as const;

async function loadMessages(locale: Locale) {
  const entries = await Promise.all(
    NAMESPACES.map(
      async (ns) => [ns, (await import(`../../messages/${locale}/${ns}.json`)).default] as const,
    ),
  );
  return Object.fromEntries(entries);
}

export default getRequestConfig(async () => {
  const cookieLocale = cookies().get('locale')?.value;
  const locale = isValidLocale(cookieLocale) ? cookieLocale : defaultLocale;

  return {
    locale,
    messages: await loadMessages(locale),
    // I18N-IMPLEMENTATION-SPEC.md § 9 — should never actually fire in
    // production if `npm run i18n:check` (§ 8a) passes, since that
    // guarantees every locale has every key. If it ever does (e.g. a key
    // referenced in code but never added to any namespace file at all,
    // which i18n:check can't catch — it only compares locales against
    // each other, not code against messages), fail loud in development
    // and render the dotted key path (visibly wrong, not a blank space
    // or a crash) in production.
    onError(error) {
      if (process.env.NODE_ENV !== 'production') console.warn('[i18n]', error.message);
    },
    getMessageFallback({ key, namespace }) {
      return namespace ? `${namespace}.${key}` : key;
    },
  };
});
