import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  setLocation: (loc: {
    stateId: string | null;
    districtId: string | null;
    subDistrictId?: string | null;
    stateName: string | null;
    districtName: string | null;
    subDistrictName?: string | null;
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
      setLocation: (loc) =>
        set({
          stateId: loc.stateId,
          districtId: loc.districtId,
          subDistrictId: loc.subDistrictId ?? null,
          stateName: loc.stateName,
          districtName: loc.districtName,
          subDistrictName: loc.subDistrictName ?? null,
        }),
      clearLocation: () =>
        set({
          stateId: null,
          districtId: null,
          subDistrictId: null,
          stateName: null,
          districtName: null,
          subDistrictName: null,
        }),
    }),
    { name: 'vytanexa_location' }
  )
);
