import type { MetadataRoute } from 'next';

/**
 * PWA Manifest — VYTANEXA-BLUEPRINT.md § S22 "PWA Configuration"
 * Next.js App Router convention: src/app/manifest.ts → /manifest.webmanifest
 * Theme color matches S01 design token brand-600 (#1756C8).
 * Icons are generated from the shared 512px brand mark + maskable variant.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Vytanexa',
    short_name: 'Vytanexa',
    description: 'Vytanexa — আপনার স্বাস্থ্য, আপনার সংযোগ',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FFFFFF',
    theme_color: '#1756C8',
    icons: [
      { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
