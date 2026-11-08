/// <reference lib="webworker" />
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  Serwist,
  StaleWhileRevalidate,
  CacheableResponsePlugin,
  type PrecacheEntry,
  type RuntimeCaching,
  type SerwistGlobalConfig,
} from 'serwist';

/**
 * Vytanexa service worker (S22). Compiled by @serwist/next into public/sw.js.
 *
 * Design rules (health app, shared devices, flaky mobile data):
 *  - Emergency is the one thing that MUST work offline: /emergency and
 *    /api/emergency-data are NetworkFirst with a cache fallback and are
 *    warmed proactively (message `WARM_EMERGENCY`) so a user who has opened
 *    the app once has numbers + nearby facilities with no signal.
 *  - Freshness over speed for content (phone numbers, availability change):
 *    pages are NetworkFirst with a short timeout, NOT stale-while-revalidate.
 *  - Never cache anything user-specific or mutating: /api/* (except
 *    emergency-data), /auth, /account, /notifications, /settings.
 *  - Updates are user-controlled (no silent skipWaiting): the page shows an
 *    "update available" toast and sends SKIP_WAITING.
 *
 * Note: Workbox-style RegExp routes match against the FULL URL
 * (https://host/path), so `^\/path` never matches. This file uses function
 * matchers on url.pathname instead (the old next-pwa config's
 * same-origin page rules were dead for exactly that reason).
 */

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const DAY = 24 * 60 * 60;

// Next.js sets `Vary: RSC, Next-Router-State-Tree, ...` on app pages. A page
// stored by the warm-up fetch (no browser navigation headers) would then never
// match a real navigation, so offline lookups fall through to /offline. Pages
// are keyed by URL (RSC payloads carry ?_rsc=), so ignoring Vary is safe.
const VARY_TOLERANT: CacheQueryOptions = { ignoreVary: true };

// Per-user / sensitive / mutating: always network, never stored.
const PRIVATE_PREFIXES = ['/auth', '/account', '/notifications', '/settings', '/api/'];
const isPrivate = (pathname: string) =>
  PRIVATE_PREFIXES.some((p) => pathname === p.replace(/\/$/, '') || pathname.startsWith(p));

const EMERGENCY_PAGE_CACHE = 'emergency-pages';
const EMERGENCY_DATA_CACHE = 'emergency-data';
const PAGE_CACHES = ['pages', 'pages-rsc', EMERGENCY_PAGE_CACHE, EMERGENCY_DATA_CACHE];

const runtimeCaching: RuntimeCaching[] = [
  // 1. Emergency API — stale numbers beat no numbers.
  {
    matcher: ({ url, sameOrigin, request }) =>
      sameOrigin && request.method === 'GET' && url.pathname === '/api/emergency-data',
    handler: new NetworkFirst({
      cacheName: EMERGENCY_DATA_CACHE,
      networkTimeoutSeconds: 4,
      matchOptions: VARY_TOLERANT,
      plugins: [
        new CacheableResponsePlugin({ statuses: [200] }),
        new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 14 * DAY }),
      ],
    }),
  },
  // 2. Emergency page (document + RSC payload).
  {
    matcher: ({ url, sameOrigin, request }) =>
      sameOrigin && request.method === 'GET' && url.pathname.startsWith('/emergency'),
    handler: new NetworkFirst({
      cacheName: EMERGENCY_PAGE_CACHE,
      networkTimeoutSeconds: 3,
      matchOptions: VARY_TOLERANT,
      plugins: [
        new CacheableResponsePlugin({ statuses: [200] }),
        new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 14 * DAY }),
      ],
    }),
  },
  // 3. Immutable build assets (content-hashed).
  {
    matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/_next/static/'),
    handler: new CacheFirst({
      cacheName: 'next-static',
      plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 365 * DAY })],
    }),
  },
  // 4. Uploaded images (Supabase storage, admin-set CDN links) — cross-origin
  //    <img> responses are opaque (status 0), so allow 0.
  {
    matcher: ({ request, sameOrigin }) => !sameOrigin && request.destination === 'image',
    handler: new CacheFirst({
      cacheName: 'remote-images',
      plugins: [
        new CacheableResponsePlugin({ statuses: [0, 200] }),
        new ExpirationPlugin({ maxEntries: 150, maxAgeSeconds: 30 * DAY, purgeOnQuotaError: true }),
      ],
    }),
  },
  // 5. Same-origin images / icons / fonts from /public.
  {
    matcher: ({ request, sameOrigin }) =>
      sameOrigin && (request.destination === 'image' || request.destination === 'font'),
    handler: new StaleWhileRevalidate({
      cacheName: 'static-assets',
      plugins: [new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 30 * DAY })],
    }),
  },
  // 6. Client-side navigations (RSC payloads) for public pages.
  {
    matcher: ({ request, url, sameOrigin }) =>
      sameOrigin &&
      request.method === 'GET' &&
      request.headers.get('RSC') === '1' &&
      !isPrivate(url.pathname),
    handler: new NetworkFirst({
      cacheName: 'pages-rsc',
      networkTimeoutSeconds: 3,
      plugins: [
        new CacheableResponsePlugin({ statuses: [200] }),
        new ExpirationPlugin({ maxEntries: 40, maxAgeSeconds: DAY }),
      ],
    }),
  },
  // 7. Full-page navigations for public pages.
  {
    matcher: ({ request, url, sameOrigin }) =>
      sameOrigin && request.mode === 'navigate' && !isPrivate(url.pathname),
    handler: new NetworkFirst({
      cacheName: 'pages',
      networkTimeoutSeconds: 3,
      matchOptions: VARY_TOLERANT,
      plugins: [
        new CacheableResponsePlugin({ statuses: [200] }),
        new ExpirationPlugin({ maxEntries: 40, maxAgeSeconds: DAY }),
      ],
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // No silent skipWaiting: the app asks the user (see PwaProvider).
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        // Any document navigation that fails with no cache match.
        url: '/offline',
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
});

serwist.addEventListeners();

// ---------------------------------------------------------------------------
// Messages from the page
// ---------------------------------------------------------------------------
self.addEventListener('message', (event) => {
  const data = event.data as { type?: string; urls?: string[] } | undefined;
  if (!data?.type) return;

  if (data.type === 'SKIP_WAITING') {
    void self.skipWaiting();
    return;
  }

  // Language changed: cached HTML/RSC is in the old language. Drop it.
  if (data.type === 'CLEAR_PAGE_CACHES') {
    event.waitUntil(Promise.all(PAGE_CACHES.map((name) => caches.delete(name))));
    return;
  }

  // Pre-fetch the emergency page + data so they exist before the user is
  // ever offline. Failures are ignored (best effort).
  if (data.type === 'WARM_EMERGENCY') {
    const urls = ['/emergency', ...(data.urls ?? [])];
    event.waitUntil(
      Promise.all(
        urls.map(async (url) => {
          try {
            const res = await fetch(url, { credentials: 'same-origin' });
            if (!res.ok) return;
            const name = url.startsWith('/api/emergency-data') ? EMERGENCY_DATA_CACHE : EMERGENCY_PAGE_CACHE;
            const cache = await caches.open(name);
            await cache.put(url, res);
          } catch {
            /* offline — keep whatever we already have */
          }
        })
      )
    );
  }
});

// ---------------------------------------------------------------------------
// Web Push
// ---------------------------------------------------------------------------
type PushPayload = {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
  type?: 'general' | 'emergency' | 'personal';
};

self.addEventListener('push', (event) => {
  let payload: PushPayload = {};
  try {
    payload = event.data ? (event.data.json() as PushPayload) : {};
  } catch {
    payload = { body: event.data?.text() };
  }

  const title = payload.title || 'Vytanexa';
  const isEmergency = payload.type === 'emergency';

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, {
        body: payload.body ?? '',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        // Same tag replaces the previous notification instead of stacking.
        tag: payload.tag ?? payload.type ?? 'vytanexa',
        data: { url: payload.url || '/notifications' },
        // Emergency alerts stay until the user acts on them.
        requireInteraction: isEmergency,
      });
      // App-icon badge with the count of notifications still on screen.
      try {
        const open = await self.registration.getNotifications();
        const nav = self.navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void> };
        await nav.setAppBadge?.(open.length);
      } catch {
        /* Badging API not supported */
      }
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const raw = (event.notification.data as { url?: string } | undefined)?.url || '/notifications';
  // Only same-origin targets: a notification must never open arbitrary sites.
  let target = '/notifications';
  try {
    const u = new URL(raw, self.location.origin);
    if (u.origin === self.location.origin) target = u.pathname + u.search + u.hash;
  } catch {
    /* keep default */
  }

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clientList) {
        if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
          await client.focus();
          if ('navigate' in client) await (client as WindowClient).navigate(target);
          return;
        }
      }
      await self.clients.openWindow(target);
    })()
  );
});

// The browser rotated/expired the subscription: re-subscribe and tell the
// server (the old row is removed server-side when its endpoint returns 410).
self.addEventListener('pushsubscriptionchange', ((event: Event) => {
  const e = event as Event & {
    oldSubscription?: PushSubscription;
    waitUntil: (p: Promise<unknown>) => void;
  };
  e.waitUntil(
    (async () => {
      try {
        const key = e.oldSubscription?.options?.applicationServerKey;
        if (!key) return;
        const sub = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        });
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub.toJSON(), resubscribe: true }),
        });
      } catch {
        /* user can re-enable from Settings */
      }
    })()
  );
}) as EventListener);
