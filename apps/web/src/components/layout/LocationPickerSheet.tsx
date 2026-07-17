'use client';

import { useEffect, useState } from 'react';
import { Search, ChevronRight, MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { getLocalizedField } from '@/lib/i18n';
import { useLocationStore } from '@/stores/location-store';
import type { Json } from '@vytanexa/database';

type LocationRow = { id: string; slug: string; name_translations: Json };
type Step = 'state' | 'district' | 'sub_district';

/**
 * Location Picker Sheet — VYTANEXA-BLUEPRINT.md § S03 "LOCATION SETUP"
 * + § S02 § 2.4. Cascading State → District → Sub-district selection
 * against the live `locations` self-referencing table.
 *
 * GPS auto-detection (spec's "🎯 আমার অবস্থান স্বয়ংক্রিয়ভাবে সনাক্ত
 * করুন" option) is deliberately deferred — reverse-geocoding a lat/lng
 * to one of our admin-created location rows needs either a mapping API
 * or a custom geo-matching function, which is a substantial feature on
 * its own rather than something to stub with fake behavior. Manual
 * selection (this component) is fully functional and is the spec's
 * required fallback path regardless, so nothing is blocked by this.
 */
export function LocationPickerSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const setLocation = useLocationStore((s) => s.setLocation);

  const [step, setStep] = useState<Step>('state');
  const [selectedState, setSelectedState] = useState<LocationRow | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<LocationRow | null>(null);
  const [options, setOptions] = useState<LocationRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep('state');
    setSelectedState(null);
    setSelectedDistrict(null);
    setSearch('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);

    const supabase = createClient();
    const type = step;
    const parentId =
      step === 'district' ? selectedState?.id : step === 'sub_district' ? selectedDistrict?.id : null;

    let query = supabase
      .from('locations')
      .select('id, slug, name_translations')
      .eq('type', type)
      .order('display_order', { ascending: true });

    query = parentId ? query.eq('parent_id', parentId) : query.is('parent_id', null);

    query.then(({ data, error }) => {
      if (cancelled) return;
      if (error) console.error('LocationPickerSheet query failed:', error.message);
      setOptions(data ?? []);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, step, selectedState, selectedDistrict]);

  const filtered = options.filter((o) =>
    getLocalizedField(o.name_translations).toLowerCase().includes(search.toLowerCase())
  );

  const selectState = (loc: LocationRow) => {
    setSelectedState(loc);
    setStep('district');
    setSearch('');
  };

  const selectDistrict = (loc: LocationRow) => {
    setSelectedDistrict(loc);
    // Confirm at district level immediately (sub-district is optional
    // per spec: "এড়িয়ে যান — শুধু জেলা ব্যবহার করুন") — the user can
    // still drill further via the next step rather than being forced
    // through a third step every time.
    setLocation({
      stateId: selectedState!.id,
      districtId: loc.id,
      stateName: getLocalizedField(selectedState!.name_translations),
      districtName: getLocalizedField(loc.name_translations),
    });
    setStep('sub_district');
    setSearch('');
  };

  const selectSubDistrict = (loc: LocationRow) => {
    setLocation({
      stateId: selectedState!.id,
      districtId: selectedDistrict!.id,
      subDistrictId: loc.id,
      stateName: getLocalizedField(selectedState!.name_translations),
      districtName: getLocalizedField(selectedDistrict!.name_translations),
      subDistrictName: getLocalizedField(loc.name_translations),
    });
    onClose();
  };

  const stepLabel =
    step === 'state'
      ? 'রাজ্য বেছে নিন'
      : step === 'district'
        ? 'জেলা বেছে নিন'
        : 'এলাকা বেছে নিন (ঐচ্ছিক)';

  return (
    <BottomSheet open={open} onClose={onClose} title="আপনার অবস্থান বেছে নিন">
      {(selectedState || selectedDistrict) && (
        <p className="mb-2 text-[12px] text-neutral-500">
          {getLocalizedField(selectedState?.name_translations)}
          {selectedDistrict && ` › ${getLocalizedField(selectedDistrict.name_translations)}`}
        </p>
      )}

      <div className="mb-3 flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-2">
        <Search className="h-4 w-4 text-neutral-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={stepLabel}
          className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-neutral-400"
        />
      </div>

      {loading && <p className="py-6 text-center text-[13px] text-neutral-400">লোড হচ্ছে...</p>}

      {!loading && filtered.length === 0 && (
        <p className="py-6 text-center text-[13px] text-neutral-400">
          {step === 'state'
            ? 'এখনো কোনো রাজ্য যোগ করা হয়নি'
            : 'এই এলাকায় এখনো কোনো উপবিভাগ যোগ করা হয়নি'}
        </p>
      )}

      {!loading &&
        filtered.map((loc) => (
          <button
            key={loc.id}
            onClick={() =>
              step === 'state'
                ? selectState(loc)
                : step === 'district'
                  ? selectDistrict(loc)
                  : selectSubDistrict(loc)
            }
            className="flex w-full items-center justify-between border-b border-neutral-100 py-3 text-left"
          >
            <span className="flex items-center gap-2 text-[15px] text-neutral-800">
              <MapPin className="h-4 w-4 text-neutral-400" />
              {getLocalizedField(loc.name_translations)}
            </span>
            <ChevronRight className="h-4 w-4 text-neutral-300" />
          </button>
        ))}

      {step === 'sub_district' && (
        <button
          onClick={onClose}
          className="mt-3 w-full rounded-md border border-neutral-200 py-2.5 text-[13px] font-medium text-neutral-600"
        >
          এড়িয়ে যান — শুধু জেলা ব্যবহার করুন
        </button>
      )}
    </BottomSheet>
  );
}
