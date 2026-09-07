import type { Metadata } from 'next';
import { Hind_Siliguri, Noto_Sans_Bengali, Plus_Jakarta_Sans } from 'next/font/google';
import { getMessages } from 'next-intl/server';
import { I18nProvider } from '@vytanexa/i18n/client';
import './globals.css';
import { cookies } from 'next/headers';
import { isValidLocale, defaultLocale, localeConfig } from '@/i18n/config';
import { createClient } from '@/lib/supabase/server';

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

export async function generateMetadata(): Promise<Metadata> {
  // TODO.md Phase 8.1: God Mode's Theme Editor (logo/favicon half —
  // the color-picker half was cut, confirmed dead) writes
  // app_settings.favicon_url; this is the read side that was missing
  // entirely before, the reason that feature did nothing on the live
  // site. Falls back to the static app/icon.svg file convention when
  // no custom favicon is set (i.e. today, for everyone, until an
  // admin actually sets one) by omitting `icons` rather than pointing
  // it at a hardcoded default.
  const supabase = createClient();
  const { data } = await supabase.from('app_settings').select('favicon_url').eq('id', 1).maybeSingle();
  const faviconUrl = (data as { favicon_url?: string | null } | null)?.favicon_url;

  return {
    title: 'Vytanexa — আপনার স্বাস্থ্য, আপনার সংযোগ',
    description:
      'Vytanexa — নিকটবর্তী ডাক্তার, হাসপাতাল, ল্যাব টেস্ট ও জরুরি স্বাস্থ্যসেবা খুঁজুন। Connect. Care. Live.',
    ...(faviconUrl ? { icons: { icon: faviconUrl } } : {}),
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // S22 + I18N-ARCHITECTURE.md: cookie-based locale (no URL prefix, S02
  // §7). The same `locale` cookie set by onboarding's LanguageStep and
  // settings' LanguageSheet is read here and threaded into both `lang=`
  // and `<I18nProvider>`, which mounts next-intl's own client provider
  // internally — components use `useT()`/`useLocalizedField()` from
  // `@vytanexa/i18n/client` (or the app-bound `lib/i18n-client.ts`
  // wrapper), never `next-intl` directly. Server-side, `getLocalizedField`
  // (`lib/i18n.ts`) resolves the identical cookie independently, since
  // Server Components can read `cookies()` synchronously and Client
  // Components cannot — see I18N-ARCHITECTURE.md § 4 for why these are two
  // symmetric implementations of one fallback chain, not two disconnected
  // locale sources (which was the original bug).
  const rawLocale = cookies().get('locale')?.value;
  const locale = isValidLocale(rawLocale) ? rawLocale : defaultLocale;
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${hindSiliguri.variable} ${notoSansBengali.variable} ${plusJakartaSans.variable}`}
    >
      <body>
        <I18nProvider locale={locale} config={localeConfig} messages={messages}>
          {/*
            BUGFIX (2026-09): the app had zero responsive/desktop styling
            anywhere in the codebase (confirmed: zero sm:/md:/lg:/xl:
            Tailwind usages in apps/web/src). On viewports wider than a
            phone, mobile-width flex/card layouts stretched full-bleed
            edge-to-edge, which reads as broken rather than intentional.
            This wraps every route group (main/seo/auth) in a single
            centered "app shell" column — a no-op on mobile (already
            narrower than 480px) and a bounded, centered column on
            desktop, matching how e.g. X/Twitter Web and WhatsApp Web
            present a mobile-shaped app inside a wide browser window.
            BottomNav and EmergencyFAB are fixed-position and therefore
            NOT bounded by this wrapper automatically (fixed positioning
            escapes normal-flow ancestors) — they're centered/offset to
            match this same 480px column independently; see BottomNav.tsx
            and EmergencyFAB.tsx.
          */}
          <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-white lg:border-x lg:border-neutral-200 lg:shadow-sm">
            {children}
          </div>
        </I18nProvider>
      </body>
    </html>
  );
}
