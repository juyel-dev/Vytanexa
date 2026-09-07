import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { defaultLocale, isValidLocale, type Locale } from './config';

// One entry per apps/admin/messages/{locale}/<namespace>.json file — see
// apps/web/src/i18n/request.ts for why this list is explicit, not globbed.
const NAMESPACES = ['app', 'nav', 'auth', 'common', 'toast'] as const;

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
    // See apps/web/src/i18n/request.ts's comment on this block.
    onError(error) {
      if (process.env.NODE_ENV !== 'production') console.warn('[i18n]', error.message);
    },
    getMessageFallback({ key, namespace }) {
      return namespace ? `${namespace}.${key}` : key;
    },
  };
});
