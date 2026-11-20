'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useT } from '@vytanexa/i18n/client';
import { useLocalizedField } from '@/lib/i18n-client';
import { useLocationStore } from '@/stores/location-store';
import type { Json } from '@vytanexa/database';

type LocationRow = { id: string; slug: string; name_translations: Json };
type Step = 'state' | 'district' | 'sub_district';

/**
 * Cascading State → District → Sub-district picker backed by the
 * locations table. GPS reverse-geocoding remains intentionally separate;
 * manual selection is the reliable fallback and works without extra APIs.
 */
export function LocationPickerSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const localize = useLocalizedField();
  const t = useT('location');
  const tc = useT('common');
  const setLocation = useLocationStore((s) => s.setLocation);

  const [step, setStep] = useState<Step>('state');
  const [selectedState, setSelectedState] = useState<LocationRow | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<LocationRow | null>(null);
  const [options, setOptions] = useState<LocationRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

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
    setFailed(false);

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
      if (error) {
        console.error('LocationPickerSheet query failed:', error.message);
        setFailed(true);
        setOptions([]);
      } else {
        setOptions(data ?? []);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, step, selectedState, selectedDistrict, retryTick]);

  const filtered = options.filter((option) =>
    localize(option.name_translations).toLowerCase().includes(search.trim().toLowerCase())
  );

  const goBack = () => {
    setSearch('');
    if (step === 'sub_district') {
      setSelectedDistrict(null);
      setStep('district');
      return;
    }
    if (step === 'district') {
      setSelectedState(null);
      setStep('state');
    }
  };

  const selectState = (loc: LocationRow) => {
    setSelectedState(loc);
    setStep('district');
    setSearch('');
  };

  const selectDistrict = (loc: LocationRow) => {
    setSelectedDistrict(loc);
    // District is a valid completed location; sub-district is optional.
    setLocation({
      stateId: selectedState!.id,
      districtId: loc.id,
      stateName: localize(selectedState!.name_translations),
      districtName: localize(loc.name_translations),
      stateNameTx: selectedState!.name_translations,
      districtNameTx: loc.name_translations,
    });
    setStep('sub_district');
    setSearch('');
  };

  const selectSubDistrict = (loc: LocationRow) => {
    setLocation({
      stateId: selectedState!.id,
      districtId: selectedDistrict!.id,
      subDistrictId: loc.id,
      stateName: localize(selectedState!.name_translations),
      districtName: localize(selectedDistrict!.name_translations),
      subDistrictName: localize(loc.name_translations),
      stateNameTx: selectedState!.name_translations,
      districtNameTx: selectedDistrict!.name_translations,
    });
    onClose();
  };

  const stepLabel = t(`step.${step}`);

  if (!open) return null;

  return (
    <section aria-label={t('sheetTitle')} className="mt-3 w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
        <h2 className="text-[14px] font-semibold text-neutral-900">{t('sheetTitle')}</h2>
        <button type="button" onClick={onClose} aria-label={tc('close')} className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600">
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <div className="max-h-[min(19rem,38dvh)] overflow-y-auto overscroll-contain px-3 py-3">
      {step !== 'state' && (
        <button
          type="button"
          onClick={goBack}
          className="mb-3 inline-flex min-h-9 items-center gap-1 rounded-lg pr-2 text-[13px] font-semibold text-brand-600 transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        >
          <ChevronLeft className="h-4 w-4" />
          {localize(selectedState!.name_translations)}
          {step === 'sub_district' && selectedDistrict
            ? ` · ${localize(selectedDistrict.name_translations)}`
            : ''}
        </button>
      )}

      <div className="mb-3 flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 transition focus-within:border-brand-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-100">
        <Search className="h-4 w-4 shrink-0 text-neutral-400" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={stepLabel}
          aria-label={stepLabel}
          className="h-11 min-w-0 flex-1 bg-transparent text-[14px] text-neutral-900 outline-none placeholder:text-neutral-400"
        />
      </div>

      <div aria-live="polite" aria-busy={loading}>
        {loading && (
          <p className="py-8 text-center text-[13px] text-neutral-500">{tc('loading')}</p>
        )}

        {!loading && failed && (
          <div className="py-8 text-center">
            <p className="text-[13px] text-neutral-600">{tc('error')}</p>
            <button
              type="button"
              onClick={() => setRetryTick((tick) => tick + 1)}
              className="mt-3 min-h-10 rounded-lg border border-neutral-300 px-5 text-[13px] font-semibold text-neutral-700 transition hover:bg-neutral-50"
            >
              {tc('retry')}
            </button>
          </div>
        )}

        {!loading && !failed && filtered.length === 0 && (
          <p className="py-8 text-center text-[13px] text-neutral-500">
            {search ? t('noSearchResults') : step === 'state' ? t('noStatesYet') : t('noSubDivisionsYet')}
          </p>
        )}

        {!loading && !failed && filtered.map((loc) => (
          <button
            key={loc.id}
            type="button"
            onClick={() =>
              step === 'state'
                ? selectState(loc)
                : step === 'district'
                  ? selectDistrict(loc)
                  : selectSubDistrict(loc)
            }
            className="flex min-h-[52px] w-full items-center justify-between gap-3 border-b border-neutral-100 px-2 text-left transition hover:bg-neutral-50 focus-visible:relative focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          >
            <span className="flex min-w-0 items-center gap-3 py-3 text-[15px] font-medium text-neutral-800">
              <MapPin className="h-4 w-4 shrink-0 text-neutral-400" />
              <span className="break-words">{localize(loc.name_translations)}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300" />
          </button>
        ))}
      </div>

      {step === 'sub_district' && (
        <button
          type="button"
          onClick={onClose}
          className="mt-4 min-h-11 w-full rounded-xl border border-neutral-200 px-4 text-[13px] font-semibold text-neutral-600 transition hover:border-neutral-300 hover:bg-neutral-50"
        >
          {t('skipUseDistrictOnly')}
        </button>
      )}
      </div>
    </section>
  );
}
