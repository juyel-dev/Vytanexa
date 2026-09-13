'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin } from 'lucide-react';
import { useT } from '@vytanexa/i18n/client';
import { useFormatter } from '@/lib/i18n-client';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { useLocationStore } from '@/stores/location-store';

const LocationPickerSheet = dynamic(
  () =>
    import('@/components/layout/LocationPickerSheet').then((m) => m.LocationPickerSheet),
  { ssr: false }
);

/**
 * Location Setup — VYTANEXA-BLUEPRINT.md § S03 "SCREEN 4"
 * Reuses the same `LocationPickerSheet` + `location-store` as the
 * always-available Location Chip elsewhere in the app (S02 § 2.4) —
 * one picker implementation, two entry points. GPS auto-detect is
 * deferred here for the same reason documented in
 * LocationPickerSheet.tsx (real reverse-geocoding is its own feature).
 */
export function LocationStep() {
  const setStep = useOnboardingStore((s) => s.setStep);
  const { stateName, districtName } = useLocationStore();
  const [pickerOpen, setPickerOpen] = useState(false);
  const t = useT('onboarding.locationStep' as Parameters<typeof useT>[0]);
  const format = useFormatter();

  const hasLocation = Boolean(stateName && districtName);

  return (
    <div className="flex min-h-dvh flex-col px-6 pt-12">
      <p className="text-[13px] text-neutral-400">{format.number(1)}/{format.number(2)}</p>
      <h1 className="mt-1 text-[20px] font-bold text-neutral-900">
        {t('title')}
      </h1>
      <p className="mt-2 text-[14px] text-neutral-600">
        {t('subtitle')}
      </p>

      <button
        onClick={() => setPickerOpen(true)}
        className="mt-8 flex h-14 items-center justify-between rounded-xl border border-neutral-200 px-4"
      >
        <span className="flex items-center gap-2 text-[15px] text-neutral-800">
          <MapPin className="h-5 w-5 text-neutral-400" />
          {hasLocation ? `${stateName} · ${districtName}` : t('selectStateDistrict')}
        </span>
        <span className="text-[13px] text-brand-600">{t('choose')}</span>
      </button>

      <div className="flex-1" />

      <div className="pb-8">
        <button
          onClick={() => setStep('signin')}
          disabled={!hasLocation}
          className="h-12 w-full rounded-md bg-brand-600 text-[16px] font-semibold text-white disabled:opacity-40"
        >
          {t('confirm')}
        </button>
        <button
          onClick={() => setStep('signin')}
          className="mt-3 w-full text-center text-[13px] text-neutral-400"
        >
          {t('skipForNow')}
        </button>
      </div>

      <LocationPickerSheet open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </div>
  );
}
