'use client';

import { useCallback, useEffect, useState } from 'react';
import { isIos, isStandalone } from '@/lib/pwa';

export type PushState =
  | 'loading'
  | 'unsupported' // browser has no Push API
  | 'needs-install' // iPhone/iPad: push only works from the Home Screen app
  | 'unconfigured' // VAPID public key not set on this deployment
  | 'blocked' // permission denied in browser/OS settings
  | 'off'
  | 'on'
  | 'working';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function currentLocale(): 'bn' | 'en' | 'hi' | undefined {
  const m = document.cookie.match(/(?:^|; )locale=(bn|en|hi)/);
  return (m?.[1] as 'bn' | 'en' | 'hi' | undefined) ?? undefined;
}

async function register(sub: PushSubscription): Promise<boolean> {
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: sub.toJSON(), locale: currentLocale() }),
  });
  return res.ok;
}

/**
 * Web Push state machine for the current device.
 * Also silently refreshes an existing subscription on mount so the server
 * row follows sign-in / sign-out (personal notifications go to the right user).
 */
export function usePushNotifications() {
  const [state, setState] = useState<PushState>('loading');
  const [error, setError] = useState<string | null>(null);

  const detect = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const supported =
      'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    if (!supported) {
      // iOS Safari tabs expose no PushManager until installed to Home Screen.
      setState(isIos() && !isStandalone() ? 'needs-install' : 'unsupported');
      return;
    }
    if (isIos() && !isStandalone()) return setState('needs-install');
    if (!VAPID_PUBLIC_KEY) return setState('unconfigured');
    if (Notification.permission === 'denied') return setState('blocked');

    try {
      const reg = await navigator.serviceWorker.getRegistration('/');
      const sub = await reg?.pushManager.getSubscription();
      if (sub && Notification.permission === 'granted') {
        setState('on');
        void register(sub).catch(() => {}); // refresh user link + last_seen
      } else {
        setState('off');
      }
    } catch {
      setState('off');
    }
  }, []);

  useEffect(() => {
    void detect();
  }, [detect]);

  const enable = useCallback(async () => {
    setError(null);
    setState('working');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'blocked' : 'off');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
        }));
      if (!(await register(sub))) {
        // Server refused: don't leave a browser-side subscription the server doesn't know.
        await sub.unsubscribe().catch(() => {});
        setError('error');
        setState('off');
        return;
      }
      setState('on');
    } catch {
      setError('error');
      setState('off');
    }
  }, []);

  const disable = useCallback(async () => {
    setError(null);
    setState('working');
    try {
      const reg = await navigator.serviceWorker.getRegistration('/');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe();
      }
      setState('off');
    } catch {
      setError('error');
      setState('on');
    }
  }, []);

  return { state, error, enable, disable };
}
