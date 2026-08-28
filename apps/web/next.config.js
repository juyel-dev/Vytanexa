const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  fallbacks: {
    document: '/offline',
  },
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
      handler: 'CacheFirst',
      options: { cacheName: 'supabase-images', expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 } },
    },
    {
      urlPattern: /\/_next\/image\?url=.*/i,
      handler: 'CacheFirst',
      options: { cacheName: 'next-images', expiration: { maxEntries: 80, maxAgeSeconds: 30 * 24 * 60 * 60 } },
    },
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
      handler: 'CacheFirst',
      options: { cacheName: 'google-fonts', expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 } },
    },
    {
      urlPattern: /\/api\/.*/i,
      handler: 'NetworkOnly',
      options: { cacheName: 'apis' },
    },
    {
      urlPattern: /^\/(doctors|hospitals)\/[^/]+\/?$/i,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'profiles', expiration: { maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 } },
    },
    {
      urlPattern: /^\/(community|symptoms|search).*$/i,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'pages', expiration: { maxEntries: 50, maxAgeSeconds: 12 * 60 * 60 } },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Supabase Storage origin — replace <project-ref> once the real
    // Supabase project exists (PROJECT-CONTEXT.md § 4, Phase 1)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // next-pwa wiring happens here in Phase 3 (S22) — deliberately not
  // added yet to keep this scaffold commit minimal and verifiable.
};

module.exports = withNextIntl(withPWA(nextConfig));
