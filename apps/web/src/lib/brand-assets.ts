/**
 * Cache-busting version for the raster brand assets (favicon.ico,
 * public/icons/*, app/apple-icon.png).
 *
 * Browsers, Chrome's installed-PWA shell and the service worker all cache
 * icons aggressively. Bump this whenever any of those files change so every
 * reference (<head> links, web manifest, install banner) points at a fresh URL.
 * It lives in one place on purpose: it used to be copy-pasted into three files.
 */
export const BRAND_ICON_VERSION = '20261121.2';

/** `/icons/icon-192x192.png` -> `/icons/icon-192x192.png?v=<version>` */
export const brandIcon = (path: string): string => `${path}?v=${BRAND_ICON_VERSION}`;
