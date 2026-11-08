/**
 * Client-side PWA helpers (S22). Browser-only: every function is safe to
 * call during SSR (returns a neutral value) but only does work in the browser.
 */

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

/** iPhone / iPad (iPadOS 13+ reports itself as a Mac with touch). */
export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && navigator.maxTouchPoints > 1);
}

/** The service worker that is (or is about to be) in charge, if any. */
export async function getActiveWorker(): Promise<ServiceWorker | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.getRegistration('/');
    return reg?.active ?? null;
  } catch {
    return null;
  }
}

export async function postToServiceWorker(message: unknown): Promise<void> {
  const sw = await getActiveWorker();
  sw?.postMessage(message);
}

/** Call after the user changes language: cached HTML/RSC is in the old language. */
export function clearPageCaches(): void {
  void postToServiceWorker({ type: 'CLEAR_PAGE_CACHES' });
}

/** Ask the worker to (re)cache the emergency page + data for offline use. */
export async function warmEmergencyCache(districtId?: string | null): Promise<void> {
  const urls = ['/api/emergency-data'];
  if (districtId) urls.push(`/api/emergency-data?district=${encodeURIComponent(districtId)}`);
  await postToServiceWorker({ type: 'WARM_EMERGENCY', urls });
}
