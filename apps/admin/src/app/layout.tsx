import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vytanexa Admin',
  description: 'Vytanexa Admin Panel — internal operator tool, not indexed.',
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Desktop-first stance (ADMIN-PANEL-SPEC.md § A01) — lang="en" default
  // since admin chrome is primarily English/mixed, distinct from the
  // Bengali-first user app.
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
