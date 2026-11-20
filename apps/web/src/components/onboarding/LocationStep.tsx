'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Check, ChevronRight, MapPin } from 'lucide-react';
import { useT } from '@vytanexa/i18n/client';
import { useFormatter } from '@/lib/i18n-client';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { useLocationNames } from '@/lib/use-location-names';

const LocationPickerSheet = dynamic(
  () =>
    import('@/components/layout/LocationPickerSheet').then((m) => m.LocationPickerSheet),
  { ssr: false }
);

/**
 * Location Setup — VYTANEXA-BLUEPRINT.md § S03 "SCREEN 4".
 * Shares the app-wide location picker so onboarding and the main app
 * always read and update the same persisted location.
 */
export function LocationStep() {
  const setStep = useOnboardingStore((s) => s.setStep);
  const { stateName, districtName } = useLocationNames();
  const [pickerOpen, setPickerOpen] = useState(false);
  const t = useT('onboarding.locationStep' as Parameters<typeof useT>[0]);
  const format = useFormatter();

  const hasLocation = Boolean(stateName && districtName);
  const selectedLocation = hasLocation ? `${stateName} · ${districtName}` : null;

  return (
    <main className="flex min-h-dvh flex-col bg-white px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-10">
      <div className="flex items-center gap-3">
        <span className="shrink-0 text-[13px] font-semibold tabular-nums text-brand-600">
          {format.number(1)}/{format.number(2)}
        </span>
        <div
          role="progressbar"
          aria-label={t('title')}
          aria-valuemin={0}
          aria-valuemax={2}
          aria-valuenow={1}
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100"
        >
          <div className="h-full w-1/2 rounded-full bg-brand-600" />
        </div>
      </div>

      <div className="mt-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <MapPin className="h-6 w-6" strokeWidth={1.8} />
        </div>
        <h1 className="mt-5 text-[24px] font-bold tracking-tight text-neutral-950">
          {t('title')}
        </h1>
        <p className="mt-2 max-w-sm text-[14px] leading-6 text-neutral-600">
          {t('subtitle')}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        aria-haspopup="dialog"
        className="group mt-8 flex min-h-[76px] w-full items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-left shadow-sm transition hover:border-brand-300 hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 transition group-hover:bg-brand-50 group-hover:text-brand-600">
          {hasLocation ? <Check className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
        </span>
        <span className="min-w-0 flex-1 break-words text-[15px] font-semibold text-neutral-900">
          {selectedLocation ?? t('selectStateDistrict')}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-brand-600">
          {t('choose')}
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </button>

      <div className="mt-auto pt-10">
        <button
          type="button"
          onClick={() => setStep('signin')}
          disabled={!hasLocation}
          className="h-12 w-full rounded-xl bg-brand-600 text-[15px] font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          {t('confirm')}
        </button>
        <button
          type="button"
          onClick={() => setStep('signin')}
          className="mt-3 min-h-10 w-full rounded-lg px-3 text-center text-[13px] font-medium text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-800"
        >
          {t('skipForNow')}
        </button>
      </div>

      <LocationPickerSheet open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </main>
  );
}
