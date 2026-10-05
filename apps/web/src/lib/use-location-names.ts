'use client';

import { useLocationStore } from '@/stores/location-store';
import { useLocalizedField } from '@/lib/i18n-client';

/**
 * Location names in the CURRENT language. The store used to persist only
 * the name string resolved at pick time, so after switching language the
 * chip / settings / more rows kept showing the old-language name until the
 * person re-picked. The picker now also stores the raw `name_translations`;
 * this hook resolves them at render time and falls back to the persisted
 * string for selections made before that change.
 */
export function useLocationNames() {
  const localize = useLocalizedField();
  const s = useLocationStore();
  return {
    stateName: (s.stateNameTx ? localize(s.stateNameTx) : '') || s.stateName,
    districtName: (s.districtNameTx ? localize(s.districtNameTx) : '') || s.districtName,
    subDistrictName: (s.subDistrictNameTx ? localize(s.subDistrictNameTx) : '') || s.subDistrictName,
  };
}
