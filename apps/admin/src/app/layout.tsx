import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import './globals.css';
import { cookies } from 'next/headers';
import { isValidLocale, defaultLocale } from '@/i18n/config';
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
  const rawLocale = cookies().get('locale')?.value;
  const locale = isValidLocale(rawLocale) ? rawLocale : defaultLocale;
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <ToastProvider>{children}</ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}