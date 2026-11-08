import { randomUUID } from 'node:crypto';
import createNextIntlPlugin from 'next-intl/plugin';
import withSerwistInit from '@serwist/next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// One revision per build for the precached offline shell. Vercel exposes the
// commit SHA; fall back to a random id locally so the precache entry always
// updates when the app does.
const revision = process.env.VERCEL_GIT_COMMIT_SHA ?? randomUUID();

// PWA service worker (S22). Replaces the unmaintained next-pwa (last
// release 2022, Workbox 6, broken App Router fallbacks). The worker itself
// lives in src/app/sw.ts and is compiled at build time into public/sw.js.
const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  // Registration + update UX are handled by components/pwa/PwaProvider.tsx
  // (update toast, offline banner, install prompt), not auto-injected.
  register: false,
  cacheOnNavigation: false,
  reloadOnOnline: false,
  disable: process.env.NODE_ENV === 'development',
  additionalPrecacheEntries: [{ url: '/offline', revision }],
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
  // PWA: see withSerwist above + src/app/sw.ts.
  async headers() {
    return [
      {
        // The worker script must never be HTTP-cached, or a new deploy's
        // service worker would not be picked up (browser update check).
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

export default withNextIntl(withSerwist(nextConfig));
