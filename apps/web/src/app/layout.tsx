import type { Metadata } from 'next';
import { Hind_Siliguri, Noto_Sans_Bengali, Plus_Jakarta_Sans } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import './globals.css';
import { cookies } from 'next/headers';
import { isValidLocale, defaultLocale } from '@/i18n/config';

// Self-hosted via next/font (no external Google Fonts network request
// at runtime — S22 performance budget). Exposed as CSS variables so
// Tailwind's fontFamily.bengali / fontFamily.sans (packages/config/
// design-tokens.js) resolve to the actual loaded font, not a fallback.
const hindSiliguri = Hind_Siliguri({
  subsets: ['bengali', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-bengali-display',
  display: 'swap',
});

const notoSansBengali = Noto_Sans_Bengali({
  subsets: ['bengali'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-bengali-body',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Vytanexa — আপনার স্বাস্থ্য, আপনার সংযোগ',
  description:
    'Vytanexa — নিকটবর্তী ডাক্তার, হাসপাতাল, ল্যাব টেস্ট ও জরুরি স্বাস্থ্যসেবা খুঁজুন। Connect. Care. Live.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // S22: cookie-based locale (no URL prefix, S02 §7). The same `locale`
  // cookie set by onboarding's LanguageStep and settings' LanguageSheet is
  // now read on the server and threaded into both `lang=` and the
  // next-intl provider — BottomNav/nav etc. can call `useTranslations()`
  // and immediately reflect the chosen language. DB content i18n (JSONB
  // *_translations via getLocalizedField) continues to work via the
  // shared `lib/getLocale.ts` helper; full UI-chrome translation is
  // incremental, but the infrastructure is now live rather than a
  // placeholder.
  const rawLocale = cookies().get('locale')?.value;
  const locale = isValidLocale(rawLocale) ? rawLocale : defaultLocale;
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${hindSiliguri.variable} ${notoSansBengali.variable} ${plusJakartaSans.variable}`}
    >
      <body>
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
