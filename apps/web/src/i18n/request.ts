import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async () => {
  const cookieLocale = cookies().get('locale')?.value;
  const locale = (['bn', 'en', 'hi'] as const).includes(cookieLocale as never)
    ? (cookieLocale as 'bn' | 'en' | 'hi')
    : 'bn';

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
