'use client';

import { useEffect, useState } from 'react';
import { useT } from '@vytanexa/i18n/client';
import { useUiStore } from '@/stores/ui-store';
import { isIos, isStandalone } from '@/lib/pwa';

const DISMISS_KEY = 'vytanexa_pwa_banner_dismissed';
const VISITS_KEY = 'vytanexa_visit_count';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/**
 * PWA Install Banner — VYTANEXA-BLUEPRINT.md § S04 SEC-13.
 * Shown after >= 2 visits, not dismissed, not installed AND only when
 * installing is actually possible:
 *   - Chromium/Android/desktop: the global `beforeinstallprompt` (captured
 *     in PwaProvider) is available -> native install on tap.
 *   - iPhone/iPad Safari: no install API exists -> show the 3-step
 *     "Share -> Add to Home Screen" instructions.
 *   - anything else (e.g. desktop Firefox): nothing to offer -> render
 *     nothing (it used to show an "Install" button that did nothing).
 */
export function PwaInstallBanner() {
  const t = useT('home.pwaInstall');
  const tp = useT('pwa.install');
  const tc = useT('common');
  const deferredPrompt = useUiStore((s) => s.deferredPrompt);
  const setDeferredPrompt = useUiStore((s) => s.setDeferredPrompt);
  const isInstalled = useUiStore((s) => s.isInstalled);
  const [eligible, setEligible] = useState(false);
  const [ios, setIos] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
      const visits = Number(localStorage.getItem(VISITS_KEY) ?? '0') + 1;
      localStorage.setItem(VISITS_KEY, String(visits));
      if (visits >= 2) setEligible(true);
    } catch {
      // Storage blocked: can't count visits, so don't nag.
    }
    setIos(isIos());
  }, []);

  const canInstall = !!deferredPrompt || ios;
  if (!eligible || isInstalled || !canInstall) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setEligible(false);
  };

  const install = async () => {
    if (deferredPrompt) {
      const evt = deferredPrompt as BeforeInstallPromptEvent;
      try {
        await evt.prompt();
        const choice = await evt.userChoice;
        // The event can only be used once.
        setDeferredPrompt(null);
        if (choice.outcome === 'dismissed') dismiss();
      } catch {
        setDeferredPrompt(null);
      }
      return;
    }
    setShowSteps(true); // iOS
  };

  return (
    <section className="mx-4 mb-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-600 text-xs font-bold text-white">
            V
          </div>
          <p className="text-[14px] font-semibold text-neutral-900">
            {showSteps ? tp('iosTitle') : t('title')}
          </p>
        </div>
        <button type="button" onClick={dismiss} aria-label={tc('close')} className="text-neutral-400">
          ✕
        </button>
      </div>

      {showSteps ? (
        <>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13px] text-neutral-600">
            <li>{tp('iosStep1')}</li>
            <li>{tp('iosStep2')}</li>
            <li>{tp('iosStep3')}</li>
          </ol>
          <button
            type="button"
            onClick={dismiss}
            className="mt-3 w-full rounded-md bg-brand-600 py-2 text-[13px] font-semibold text-white"
          >
            {tp('gotIt')}
          </button>
        </>
      ) : (
        <>
          <p className="mt-1 text-[13px] text-neutral-500">{t('subtitle')}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={install}
              className="flex-1 rounded-md bg-brand-600 py-2 text-[13px] font-semibold text-white"
            >
              {deferredPrompt ? t('installNow') : tp('howTo')}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="flex-1 rounded-md border border-neutral-200 py-2 text-[13px] font-semibold text-neutral-700"
            >
              {t('later')}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
