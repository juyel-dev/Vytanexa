'use client';

import { useEffect, useRef } from 'react';
import { useT } from '@vytanexa/i18n/client';
import { useUiStore } from '@/stores/ui-store';
import { useLocationStore } from '@/stores/location-store';
import { isStandalone, warmEmergencyCache } from '@/lib/pwa';

const WARM_KEY = 'vytanexa_emergency_warmed';
const WARM_EVERY_MS = 6 * 60 * 60 * 1000;

type SerwistWindow = import('@serwist/window').Serwist;

/**
 * PWA runtime (S22). Mounted once in the root layout.
 *  - registers /sw.js (production only)
 *  - surfaces "new version available" and applies it only on user consent
 *  - tracks connectivity for the offline banner
 *  - captures the install prompt globally (any screen can offer install)
 *  - keeps the emergency page/data warm in the offline cache
 */
export function PwaProvider() {
  const serwistRef = useRef<SerwistWindow | null>(null);
  const reloadOnControl = useRef(false);
  const { setUpdateAvailable, setOffline, setDeferredPrompt, setInstalled } = useUiStore.getState();
  const districtId = useLocationStore((s) => s.districtId);

  // --- install state + connectivity ---------------------------------------
  useEffect(() => {
    setInstalled(isStandalone());
    setOffline(!navigator.onLine);

    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // we show our own prompt
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [setDeferredPrompt, setInstalled, setOffline]);

  // --- service worker registration + updates ------------------------------
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;

    (async () => {
      const { Serwist } = await import('@serwist/window');
      if (cancelled) return;
      const sw = new Serwist('/sw.js', { scope: '/', type: 'classic' });
      serwistRef.current = sw;

      // A new worker finished installing and is waiting for us to say go.
      sw.addEventListener('waiting', () => setUpdateAvailable(true));
      // After the user accepted, the new worker took control -> reload once.
      sw.addEventListener('controlling', () => {
        if (reloadOnControl.current) window.location.reload();
      });

      try {
        const reg = await sw.register();
        const check = () => void reg?.update().catch(() => {});
        // Look for a new deploy when the app returns to the foreground
        // and hourly while open (installed apps can stay open for days).
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') check();
        });
        interval = setInterval(check, 60 * 60 * 1000);
      } catch {
        /* registration failed (private mode, blocked): app still works online */
      }
    })();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [setUpdateAvailable]);

  // --- keep emergency data available offline ------------------------------
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator) || !navigator.onLine) return;

    let last = 0;
    try {
      last = Number(localStorage.getItem(WARM_KEY) ?? '0');
    } catch {
      /* storage blocked */
    }
    const stamp = `${districtId ?? ''}`;
    const lastDistrict = (() => {
      try {
        return localStorage.getItem(`${WARM_KEY}_district`) ?? '';
      } catch {
        return '';
      }
    })();
    // Re-warm if stale OR the user picked a different district.
    if (Date.now() - last < WARM_EVERY_MS && lastDistrict === stamp) return;

    navigator.serviceWorker.ready
      .then(() => warmEmergencyCache(districtId))
      .then(() => {
        try {
          localStorage.setItem(WARM_KEY, String(Date.now()));
          localStorage.setItem(`${WARM_KEY}_district`, stamp);
        } catch {
          /* ignore */
        }
      })
      .catch(() => {});
  }, [districtId]);

  return <PwaStatusUi onApplyUpdate={() => {
    reloadOnControl.current = true;
    serwistRef.current?.messageSkipWaiting();
  }} />;
}

function PwaStatusUi({ onApplyUpdate }: { onApplyUpdate: () => void }) {
  const t = useT('pwa');
  const updateAvailable = useUiStore((s) => s.updateAvailable);
  const isOffline = useUiStore((s) => s.isOffline);
  const setUpdateAvailable = useUiStore((s) => s.setUpdateAvailable);

  return (
    <>
      {isOffline && (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-1/2 top-0 z-toast w-full max-w-[480px] -translate-x-1/2 bg-neutral-800 px-4 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] text-center text-[12px] font-medium text-white"
        >
          {t('offlineBanner')}
        </div>
      )}
      {updateAvailable && (
        <div
          role="alert"
          className="fixed bottom-[calc(theme(spacing.navbar)+12px+env(safe-area-inset-bottom))] left-1/2 z-toast flex w-[calc(100%-2rem)] max-w-[448px] -translate-x-1/2 items-center gap-3 rounded-xl bg-neutral-900 px-4 py-3 text-white shadow-lg"
        >
          <p className="min-w-0 flex-1 text-[13px] font-medium">{t('updateTitle')}</p>
          <button
            type="button"
            onClick={() => setUpdateAvailable(false)}
            className="shrink-0 text-[13px] text-neutral-300"
          >
            {t('updateLater')}
          </button>
          <button
            type="button"
            onClick={onApplyUpdate}
            className="shrink-0 rounded-md bg-white px-3 py-1.5 text-[13px] font-semibold text-neutral-900"
          >
            {t('updateAction')}
          </button>
        </div>
      )}
    </>
  );
}
