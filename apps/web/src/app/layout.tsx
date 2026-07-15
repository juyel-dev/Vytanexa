import type { Metadata } from 'next';
import { Hind_Siliguri, Noto_Sans_Bengali, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Locale detection (cookie-based, S02 § 7) wired in a later Phase 2
  // step alongside next-intl setup. `lang="bn"` as the correct default
  // in the meantime.
  return (
    <html
      lang="bn"
      className={`${hindSiliguri.variable} ${notoSansBengali.variable} ${plusJakartaSans.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
