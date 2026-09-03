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
    // Crawler found placeholder ads (via.placeholder.com) caused _next/image 500s + 13s timeouts.
    // For dummy/seed data we still allow external placeholder hosts, but set unoptimized to avoid
    // server-side fetch during dev (direct browser fetch is fast and doesn't block crawling).
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      { protocol: 'https', hostname: 'via.placeholder.com' },
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: '*.placeholder.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      // imgbb direct image links (https://i.ibb.co/...) — admin AdsManager
      // accepts any https image URL and its table uses plain <img>, but the
      // user app renders banners via next/image which rejects unlisted hosts.
      { protocol: 'https', hostname: 'i.ibb.co' },
    ],
  },
  // next-pwa wiring happens here in Phase 3 (S22) — deliberately not
  // added yet to keep this scaffold commit minimal and verifiable.
};

module.exports = withNextIntl(withPWA(nextConfig));
