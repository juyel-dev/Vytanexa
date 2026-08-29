import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { defaultLocale, isValidLocale } from './config';

export default getRequestConfig(async () => {
  const cookieLocale = cookies().get('locale')?.value;
  const locale = isValidLocale(cookieLocale) ? cookieLocale : defaultLocale;
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});