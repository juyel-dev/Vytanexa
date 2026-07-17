'use client';

import { useState } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useLocationStore } from '@/stores/location-store';

// Same code-splitting rationale as EmergencyFAB (see (main)/layout.tsx)
// -- the picker's Supabase browser-client queries only matter once the
// user actually taps the chip, so they shouldn't weigh down first load.
const LocationPickerSheet = dynamic(
  () => import('./LocationPickerSheet').then((m) => m.LocationPickerSheet),
  { ssr: false }
);

/**
 * Location Chip — VYTANEXA-BLUEPRINT.md § S02 § 2.4 + § S04 (below top
 * bar on Home/List/Search pages). Reads the shared Zustand location
 * store (persisted client-side) so every page that renders this chip
 * stays in sync automatically once the user picks a location once.
 */
export function LocationChip() {
  const [open, setOpen] = useState(false);
  const { districtName, stateName, subDistrictName } = useLocationStore();

  const label = stateName
    ? subDistrictName
      ? `${stateName} · ${districtName} · ${subDistrictName}`
      : `${stateName} · ${districtName}`
    : 'অবস্থান বেছে নিন';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`mx-4 my-2 flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] ${
          stateName
            ? 'bg-neutral-100 text-neutral-700'
            : 'border border-dashed border-brand-300 text-brand-600'
        }`}
      >
        <MapPin className="h-3.5 w-3.5" />
        <span className="truncate">{label}</span>
        <ChevronDown className="h-3 w-3 shrink-0" />
      </button>

      {open && <LocationPickerSheet open={open} onClose={() => setOpen(false)} />}
    </>
  );
}
