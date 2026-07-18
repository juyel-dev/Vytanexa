'use client';

import { useEffect } from 'react';
import { useOnboardingStore } from '@/stores/onboarding-store';

/**
 * Splash — VYTANEXA-BLUEPRINT.md § S03 "SCREEN 1 — SPLASH"
 * 2s brand-600 full-bleed screen, then auto-advances. On a resumed
 * onboarding session (app was killed mid-flow) this step is skipped
 * entirely since the store's persisted step already moved past it.
 */
export function SplashStep() {
  const setStep = useOnboardingStore((s) => s.setStep);

  useEffect(() => {
    const timer = setTimeout(() => setStep('language'), 2000);
    return () => clearTimeout(timer);
  }, [setStep]);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-brand-600 px-6">
      <div className="flex h-[72px] w-[72px] animate-scale-in items-center justify-center rounded-2xl bg-white text-2xl font-bold text-brand-600">
        V
      </div>
      <h1 className="mt-4 animate-fade-in text-[28px] font-bold text-white">Vytanexa</h1>
      <p className="mt-1 animate-fade-in text-[13px] tracking-wide text-brand-100">
        Connect. Care. Live.
      </p>
      <div className="absolute bottom-16 h-[2px] w-40 overflow-hidden rounded-full bg-white/25">
        <div className="h-full w-full origin-left animate-progress bg-white" />
      </div>
      <p className="absolute bottom-8 text-[11px] text-brand-100">Powered by Vytanexa</p>
    </div>
  );
}
