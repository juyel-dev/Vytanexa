import type { MetadataRoute } from 'next';
import { cookies } from 'next/headers';
import { getT } from '@vytanexa/i18n/server';

/**
 * PWA Manifest — VYTANEXA-BLUEPRINT.md § S22.
 * The ONLY manifest (served at /manifest.webmanifest; Next auto-links it).
 * A second static public/manifest.json used to exist and layout.tsx pointed
 * at it, so two conflicting <link rel="manifest"> tags were emitted.
 *
 * Locale-aware (cookie, like the rest of the app): description, shortcut
 * labels and `lang` follow the user's language. Fetched at install time,
 * not per page load.
 *
 * `id` is pinned so the install identity survives future start_url changes
 * (without it browsers derive identity from start_url and treat a change as
 * a different app).
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const [t, tNav, tEm] = await Promise.all([getT('common'), getT('nav'), getT('emergency')]);
  const rawLocale = cookies().get('locale')?.value;
  const lang = rawLocale === 'en' || rawLocale === 'hi' || rawLocale === 'bn' ? rawLocale : 'bn';

  return {
    id: '/',
    name: 'Vytanexa',
    short_name: 'Vytanexa',
    description: `Vytanexa — ${t('tagline')}`,
    lang,
    dir: 'ltr',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'portrait',
    background_color: '#FFFFFF',
    theme_color: '#1756C8',
    categories: ['health', 'medical', 'lifestyle'],
    icons: [
      { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    // Long-press the installed icon: straight to the most urgent tasks.
    shortcuts: [
      { name: tEm('pageTitle'), url: '/emergency?source=shortcut', icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }] },
      { name: tNav('doctors'), url: '/doctors?source=shortcut', icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }] },
      { name: tNav('hospitals'), url: '/hospitals?source=shortcut', icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }] },
      { name: tNav('search'), url: '/search?source=shortcut', icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }] },
    ],
    prefer_related_applications: false,
  };
}
