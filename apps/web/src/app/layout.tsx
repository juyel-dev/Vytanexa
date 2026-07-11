import type { Metadata } from 'next';
import './globals.css';

// Font loading (next/font, self-hosted per S22 performance budget —
// no external Google Fonts network request) will be wired in Phase 2
// alongside the Bengali-first typography system from S01. Deliberately
// deferred here to keep this scaffold commit minimal and verifiable.

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
  // Locale detection (cookie-based, S02 § 7) wired in Phase 2 alongside
  // next-intl setup. `lang="bn"` as the correct default in the meantime.
  return (
    <html lang="bn">
      <body>{children}</body>
    </html>
  );
}
