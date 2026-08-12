'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Phone, Ambulance, Droplet, Building2 } from 'lucide-react';
import { useLocationStore } from '@/stores/location-store';
import { LocationChip } from '@/components/layout/LocationChip';
import { getLocalizedField } from '@/lib/i18n';
import type { Json } from '@vytanexa/database';

type EmergencyHospital = {
  id: string;
  slug: string;
  name_translations: Json;
  phone: string;
  address_line: string;
};
type AmbulanceProvider = { id: string; name_translations: Json; phone: string };
type BloodBankRow = {
  id: string;
  name_translations: Json;
  phone: string;
};

function trackCall(numberType: string, label: string) {
  fetch('/api/analytics', {
    method: 'POST',
    body: JSON.stringify({
      event_type: 'emergency_call_click',
      metadata: { number_type: numberType, label },
    }),
  }).catch(() => {
    // fire-and-forget, matches HeroBannerSliderClient's ad_click pattern
  });
}

/**
 * Emergency Data Sections — VYTANEXA-BLUEPRINT.md § S12: Location Chip
 * + the hospital/blood-bank/ambulance sections, everything on the page
 * that genuinely needs a network round-trip. Deliberately split out
 * from `NationalNumbersSection` (hardcoded, no fetch at all).
 *
 * Fetches via `/api/emergency-data` (a Route Handler) rather than the
 * browser Supabase client directly — see that route's own comment for
 * why: this component tried `createClient()` from `lib/supabase/
 * client.ts` first (matching `EmergencyFAB`'s existing pattern) and it
 * pushed the page to 171KB First Load JS, over S22's 150KB budget, in
 * a way `next/dynamic({ssr:false})` didn't resolve. Every other list
 * page in this app (hospitals, doctors, lab-tests, blood-services)
 * already fetches server-side or via a Route Handler for exactly this
 * reason — this just brings S12 in line with that established pattern.
 *
 * District filtering: when a district is selected via the Location
 * Chip, the hospital/ambulance queries scope to it (`location_id`
 * equality on the server) — exact real filtering, not just a sort
 * tiebreaker. Blood banks stay nationwide (S11's `getBloodBanks`
 * doesn't take a district param yet). With no district selected,
 * everything shows nationally.
 *
 * This page is the first to actually wire up `useLocationStore` for
 * real filtering. S08/S10/S11 deferred location filtering with a note
 * that no selector existed anywhere in the app yet — that note was
 * incorrect (the Location Chip + store already existed from earlier
 * foundational work); flagged in TODO.md as worth revisiting for
 * those pages too.
 */
export function EmergencyDataSections() {
  const { districtId, districtName } = useLocationStore();
  const [hospitals, setHospitals] = useState<EmergencyHospital[]>([]);
  const [bloodBanks, setBloodBanks] = useState<BloodBankRow[]>([]);
  const [ambulances, setAmbulances] = useState<AmbulanceProvider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const params = districtId ? `?district=${districtId}` : '';
    fetch(`/api/emergency-data${params}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        setHospitals(json.hospitals ?? []);
        setAmbulances(json.ambulances ?? []);
        setBloodBanks(json.bloodBanks ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [districtId]);

  return (
    <>
      <div className="border-b border-neutral-100">
        <LocationChip />
      </div>

      <section className="px-4 py-4">
        <h2 className="mb-3 flex items-center gap-1.5 text-[15px] font-bold text-neutral-800">
          <Building2 className="h-4 w-4" /> জরুরি বিভাগ (কাছের হাসপাতাল)
        </h2>
        {loading ? (
          <p className="text-[13px] text-neutral-400">লোড হচ্ছে...</p>
        ) : hospitals.length === 0 ? (
          <p className="text-[13px] text-neutral-400">
            {districtName
              ? `${districtName}-এ জরুরি বিভাগসহ হাসপাতাল এখনো যোগ করা হয়নি।`
              : 'এই মুহূর্তে জরুরি বিভাগসহ হাসপাতাল যোগ করা হয়নি।'}
          </p>
        ) : (
          hospitals.map((h) => (
            <div
              key={h.id}
              className="mb-2 flex items-center justify-between rounded-lg border border-neutral-200 p-3"
            >
              <div className="min-w-0">
                <Link
                  href={`/hospitals/${h.slug}`}
                  className="block truncate text-[14px] font-semibold text-neutral-900"
                >
                  {getLocalizedField(h.name_translations)}
                </Link>
                <p className="truncate text-[12px] text-neutral-500">{h.address_line}</p>
              </div>
              <a
                href={`tel:${h.phone}`}
                onClick={() => trackCall('local_hospital', h.id)}
                className="ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emergency-600 text-white"
              >
                <Phone className="h-4 w-4" />
              </a>
            </div>
          ))
        )}
      </section>

      <section className="border-t border-neutral-100 px-4 py-4">
        <h2 className="mb-3 flex items-center gap-1.5 text-[15px] font-bold text-neutral-800">
          <Droplet className="h-4 w-4" /> ব্লাড ব্যাংক
        </h2>
        {loading ? (
          <p className="text-[13px] text-neutral-400">লোড হচ্ছে...</p>
        ) : bloodBanks.length === 0 ? (
          <p className="text-[13px] text-neutral-400">এই মুহূর্তে কোনো ব্লাড ব্যাংক তালিকাভুক্ত নেই।</p>
        ) : (
          bloodBanks.slice(0, 3).map((b) => (
            <div
              key={b.id}
              className="mb-2 flex items-center justify-between rounded-lg border border-neutral-200 p-3"
            >
              <span className="truncate text-[14px] font-semibold text-neutral-900">
                {getLocalizedField(b.name_translations)}
              </span>
              <a
                href={`tel:${b.phone}`}
                onClick={() => trackCall('blood_bank', b.id)}
                className="ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emergency-600 text-white"
              >
                <Phone className="h-4 w-4" />
              </a>
            </div>
          ))
        )}
        <Link
          href="/health/blood-services"
          className="mt-1 block text-center text-[13px] font-semibold text-brand-600"
        >
          সব ব্লাড সার্ভিস দেখুন →
        </Link>
      </section>

      <section className="border-t border-neutral-100 px-4 py-4">
        <h2 className="mb-3 flex items-center gap-1.5 text-[15px] font-bold text-neutral-800">
          <Ambulance className="h-4 w-4" /> অ্যাম্বুলেন্স সার্ভিস
        </h2>
        {loading ? (
          <p className="text-[13px] text-neutral-400">লোড হচ্ছে...</p>
        ) : ambulances.length === 0 ? (
          <p className="text-[13px] text-neutral-400">
            {districtName
              ? `${districtName}-এ কোনো অ্যাম্বুলেন্স সার্ভিস এখনো যোগ করা হয়নি।`
              : 'এই মুহূর্তে কোনো অ্যাম্বুলেন্স সার্ভিস যোগ করা হয়নি।'}
          </p>
        ) : (
          ambulances.map((a) => (
            <div
              key={a.id}
              className="mb-2 flex items-center justify-between rounded-lg border border-neutral-200 p-3"
            >
              <span className="truncate text-[14px] font-semibold text-neutral-900">
                {getLocalizedField(a.name_translations)}
              </span>
              <a
                href={`tel:${a.phone}`}
                onClick={() => trackCall('ambulance', a.id)}
                className="ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emergency-600 text-white"
              >
                <Phone className="h-4 w-4" />
              </a>
            </div>
          ))
        )}
      </section>
    </>
  );
}
