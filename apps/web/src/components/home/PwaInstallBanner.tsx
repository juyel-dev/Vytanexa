'use client';

import { useEffect, useState } from 'react';

/**
 * PWA Install Banner — VYTANEXA-BLUEPRINT.md § S04 SEC-13
 * Shows after visits >= 2 AND not dismissed AND not already installed.
 * Captures the native `beforeinstallprompt` event and replays it on
 * tap (per spec). Full PWA manifest/service-worker wiring (S22) is a
 * separate TODO item — this banner is correct and inert (no-op
 * install button) until that infrastructure exists, which is honest
 * behavior rather than faking an install flow prematurely.
 */
export function PwaInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);

  useEffect(() => {
    const dismissed = localStorage.getItem('vytanexa_pwa_banner_dismissed');
    if (dismissed) return;

    const visits = Number(localStorage.getItem('vytanexa_visit_count') ?? '0') + 1;
    localStorage.setItem('vytanexa_visit_count', String(visits));

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (visits >= 2 && !isStandalone) {
      setVisible(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!visible) return null;

  const handleInstall = async () => {
    if (deferredPrompt && 'prompt' in deferredPrompt) {
      // @ts-expect-error -- BeforeInstallPromptEvent isn't in lib.dom.d.ts yet
      await deferredPrompt.prompt();
    }
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('vytanexa_pwa_banner_dismissed', '1');
    setVisible(false);
  };

  return (
    <section className="mx-4 mb-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-600 text-xs font-bold text-white">
            V
          </div>
          <p className="text-[14px] font-semibold text-neutral-900">Vytanexa ইনস্টল করুন</p>
        </div>
        <button onClick={handleDismiss} aria-label="বন্ধ করুন" className="text-neutral-400">
          ✕
        </button>
      </div>
      <p className="mt-1 text-[13px] text-neutral-500">
        হোম স্ক্রিনে যুক্ত করুন — অ্যাপের মতো অভিজ্ঞতা নিন
      </p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleInstall}
          className="flex-1 rounded-md bg-brand-600 py-2 text-[13px] font-semibold text-white"
        >
          এখনই ইনস্টল করুন
        </button>
        <button
          onClick={handleDismiss}
          className="flex-1 rounded-md border border-neutral-200 py-2 text-[13px] font-semibold text-neutral-700"
        >
          পরে করব
        </button>
      </div>
    </section>
  );
}
