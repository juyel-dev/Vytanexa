import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Json } from '@vytanexa/database';

/**
 * Location Store — VYTANEXA-BLUEPRINT.md § S03 "STATE MANAGEMENT —
 * Onboarding" (location portion) + § S02 § 2.4 Location Chip.
 * Persisted to localStorage under `vytanexa_location` so the
 * selection survives reloads/sessions, matching the spec's stated
 * localStorage key.
 */
export type LocationState = {
  stateId: string | null;
  districtId: string | null;
  subDistrictId: string | null;
  stateName: string | null;
  districtName: string | null;
  subDistrictName: string | null;
  // Raw translations so names re-localize when the language changes
  // (see lib/use-location-names.ts). Optional: older persisted state has none.
  stateNameTx?: Json | null;
  districtNameTx?: Json | null;
  subDistrictNameTx?: Json | null;
  setLocation: (loc: {
    stateId: string | null;
    districtId: string | null;
    subDistrictId?: string | null;
    stateName: string | null;
    districtName: string | null;
    subDistrictName?: string | null;
    stateNameTx?: Json | null;
    districtNameTx?: Json | null;
    subDistrictNameTx?: Json | null;
  }) => void;
  clearLocation: () => void;
};

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      stateId: null,
      districtId: null,
      subDistrictId: null,
      stateName: null,
      districtName: null,
      subDistrictName: null,
      stateNameTx: null,
      districtNameTx: null,
      subDistrictNameTx: null,
      setLocation: (loc) =>
        set({
          stateId: loc.stateId,
          districtId: loc.districtId,
          subDistrictId: loc.subDistrictId ?? null,
          stateName: loc.stateName,
          districtName: loc.districtName,
          subDistrictName: loc.subDistrictName ?? null,
          stateNameTx: loc.stateNameTx ?? null,
          districtNameTx: loc.districtNameTx ?? null,
          subDistrictNameTx: loc.subDistrictNameTx ?? null,
        }),
      clearLocation: () =>
        set({
          stateId: null,
          districtId: null,
          subDistrictId: null,
          stateName: null,
          districtName: null,
          subDistrictName: null,
          stateNameTx: null,
          districtNameTx: null,
          subDistrictNameTx: null,
        }),
    }),
    { name: 'vytanexa_location' }
  )
);
