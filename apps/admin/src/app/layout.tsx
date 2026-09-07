import type { Metadata } from 'next';
import { getMessages } from 'next-intl/server';
import { I18nProvider } from '@vytanexa/i18n/client';
import './globals.css';
import { cookies } from 'next/headers';
import { isValidLocale, defaultLocale, localeConfig } from '@/i18n/config';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: 'Vytanexa Admin',
  description: 'Vytanexa Admin Panel — internal operator tool, not indexed.',
  robots: { index: false, follow: false },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // See apps/web/src/app/layout.tsx's comment — identical pattern.
  const rawLocale = cookies().get('locale')?.value;
  const locale = isValidLocale(rawLocale) ? rawLocale : defaultLocale;
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <I18nProvider locale={locale} config={localeConfig} messages={messages}>
          <ToastProvider>{children}</ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
