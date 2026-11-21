'use client';

import Image from 'next/image';
import { useEffect } from 'react';
import { useOnboardingStore } from '@/stores/onboarding-store';

/**
 * Lightweight brand splash. Advances directly to the single introduction
 * screen; the intro itself uses CSS-only animations and no remote assets.
 */
export function SplashStep() {
  const setStep = useOnboardingStore((s) => s.setStep);

  useEffect(() => {
    const timer = setTimeout(() => setStep('slides'), 2000);
    return () => clearTimeout(timer);
  }, [setStep]);

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-brand-600 px-6">
      <div
        aria-hidden="true"
        className="flex h-20 w-20 animate-scale-in items-center justify-center rounded-3xl bg-white shadow-lg shadow-brand-950/10"
      >
        <Image
          src="/brand/vytanexa-symbol.svg"
          alt=""
          width={64}
          height={64}
          priority
          className="h-16 w-16 object-contain"
        />
      </div>
      <h1 className="mt-5 animate-fade-in text-[30px] font-bold tracking-tight text-white">
        Vytanexa
      </h1>
      <p className="mt-2 animate-fade-in text-sm font-medium tracking-wide text-brand-100">
        Healthcare, Connected.
      </p>
      <div
        aria-hidden="true"
        className="absolute bottom-16 h-[2px] w-40 overflow-hidden rounded-full bg-white/25"
      >
        <div className="h-full w-full origin-left animate-progress bg-white" />
      </div>
    </div>
  );
}
