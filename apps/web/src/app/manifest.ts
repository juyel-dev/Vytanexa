import type { MetadataRoute } from 'next';
import { getT } from '@vytanexa/i18n/server';

/**
 * PWA Manifest — VYTANEXA-BLUEPRINT.md § S22 "PWA Configuration"
 * Next.js App Router convention: src/app/manifest.ts → /manifest.webmanifest
 * Theme color matches S01 design token brand-600 (#1756C8).
 * Icons are generated from the shared 512px brand mark + maskable variant.
 *
 * Async + getT() here (reads the locale cookie) rather than a static
 * export — this file is fetched once at PWA install time per device,
 * not on every page load, so the dynamic-rendering cost this incurs is
 * paid once, not per-request; a hardcoded-Bengali description would
 * otherwise show up in every non-Bengali user's install prompt.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getT('common');
  return {
    name: 'Vytanexa',
    short_name: 'Vytanexa',
    description: `Vytanexa — ${t('tagline')}`,
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
