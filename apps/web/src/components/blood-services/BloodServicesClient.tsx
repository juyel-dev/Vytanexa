'use client';

import { useEffect, useMemo, useState } from 'react';
import { Phone } from 'lucide-react';
import { getLocalizedField } from '@/lib/i18n';
import { DonorRegistrationSheet } from './DonorRegistrationSheet';
import { LocationChip } from '@/components/layout/LocationChip';
import { useLocationStore } from '@/stores/location-store';
import type { BloodBank } from '@/lib/queries/blood-services';
import type { Json } from '@vytanexa/database';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

const STOCK_ICON: Record<string, string> = {
  available: '✅',
  low: '⚠️',
  unavailable: '❌',
};

type Donor = {
  id: string;
  name: string;
  blood_group: string;
  location_id: string;
  last_donated_at: string | null;
};
type District = { id: string; slug: string; name_translations: Json };

/**
 * Blood Services — VYTANEXA-BLUEPRINT.md § S11. "Design principle:
 * zero friction, maximum speed-to-phone-number." Blood group filter
 * (emergency-600 theme, distinct from brand-blue elsewhere per spec)
 * narrows both blood bank stock display and the donor list at once.
 *
 * District filtering (Location Chip + Zustand store) — added after
 * S12 uncovered these already existed in the app (see TODO.md's S12
 * correction note; the original claim that no selector existed was
 * wrong). The page's own SSR fetch handles first paint nationally
 * (the server can't see the client's persisted district), then this
 * component refetches via `/api/blood-services` whenever the district
 * changes, replacing `bloodBanks`/`donors` with the scoped results.
 */
export function BloodServicesClient({
  bloodBanks: initialBloodBanks,
  donors: initialDonors,
  districts,
}: {
  bloodBanks: BloodBank[];
  donors: Donor[];
  districts: District[];
}) {
  const { districtId } = useLocationStore();
  const [bloodBanks, setBloodBanks] = useState(initialBloodBanks);
  const [donors, setDonors] = useState(initialDonors);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);

  useEffect(() => {
    if (!districtId) {
      setBloodBanks(initialBloodBanks);
      setDonors(initialDonors);
      return;
    }
    let cancelled = false;
    const params = new URLSearchParams({ district: districtId });
    if (selectedGroup) params.set('bloodGroup', selectedGroup);
    fetch(`/api/blood-services?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        setBloodBanks(json.bloodBanks ?? []);
        setDonors(json.donors ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [districtId, selectedGroup]);

  const filteredDonors = useMemo(
    () => (selectedGroup ? donors.filter((d) => d.blood_group === selectedGroup) : donors),
    [donors, selectedGroup]
  );

  return (
    <div className="pb-6">
      <LocationChip />
      <div className="px-4 py-4">
        <h2 className="mb-2.5 text-[14px] font-semibold text-neutral-700">
          আপনার রক্তের গ্রুপ বেছে নিন
        </h2>
        <div className="flex flex-wrap gap-2">
          {BLOOD_GROUPS.map((bg) => (
            <button
              key={bg}
              onClick={() => setSelectedGroup(selectedGroup === bg ? null : bg)}
              className={`h-9 rounded-full border px-4 text-[13px] font-semibold ${
                selectedGroup === bg
                  ? 'border-emergency-600 bg-emergency-600 text-white'
                  : 'border-neutral-200 text-neutral-700'
              }`}
            >
              {bg}
            </button>
          ))}
          <button
            onClick={() => setSelectedGroup(null)}
            className={`h-9 rounded-full border px-4 text-[13px] font-semibold ${
              selectedGroup === null
                ? 'border-emergency-600 bg-emergency-600 text-white'
                : 'border-neutral-200 text-neutral-700'
            }`}
          >
            সবগুলো
          </button>
        </div>
      </div>

      <div className="px-4 py-3">
        <button
          onClick={() => setRegisterOpen(true)}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-life-600 text-[14px] font-semibold text-white"
        >
          🩸 + রক্তদাতা হিসেবে নাম লেখান
        </button>
      </div>

      <section className="px-4 py-4">
        <h2 className="mb-3 text-[15px] font-bold text-neutral-800">
          ব্লাড ব্যাংক ({bloodBanks.length}টি)
        </h2>
        {bloodBanks.length === 0 ? (
          <p className="text-[13px] text-neutral-400">এই মুহূর্তে কোনো ব্লাড ব্যাংক তালিকাভুক্ত নেই।</p>
        ) : (
          bloodBanks
            .filter(
              (b) => !selectedGroup || b.stock.some((s) => s.blood_group === selectedGroup)
            )
            .map((bank) => (
              <div
                key={bank.id}
                className="mb-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-card"
              >
                <h3 className="text-[15px] font-bold text-neutral-900">
                  🏥 {getLocalizedField(bank.name_translations)}
                </h3>
                <p className="mt-0.5 text-[13px] text-neutral-500">
                  📍 {bank.address_line}
                  {bank.has_emergency_dept && '  ·  🕐 ২৪ ঘণ্টা খোলা'}
                </p>

                {bank.stock.length > 0 && (
                  <div className="mt-2">
                    <p className="mb-1 text-[12px] text-neutral-500">
                      স্টক (যদি রিপোর্ট করা থাকে):
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[13px]">
                      {bank.stock.map((s) => (
                        <span key={s.blood_group}>
                          {s.blood_group}
                          {STOCK_ICON[s.stock_level] ?? ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <a
                  href={`tel:${bank.phone}`}
                  className="mt-3 flex h-10 items-center justify-center gap-2 rounded-md bg-emergency-600 text-[13px] font-semibold text-white"
                >
                  <Phone className="h-4 w-4" /> এখনই কল করুন
                </a>
              </div>
            ))
        )}
      </section>

      <section className="border-t border-neutral-100 px-4 py-4">
        <h2 className="mb-3 text-[15px] font-bold text-neutral-800">রক্তদাতা তালিকা</h2>
        {filteredDonors.length === 0 ? (
          <p className="text-[13px] text-neutral-400">
            {selectedGroup
              ? `${selectedGroup} গ্রুপের কোনো নিবন্ধিত রক্তদাতা এখনো নেই।`
              : 'এখনো কোনো নিবন্ধিত রক্তদাতা নেই। প্রথম হোন!'}
          </p>
        ) : (
          filteredDonors.map((donor) => (
            <div
              key={donor.id}
              className="mb-2 flex items-center justify-between rounded-lg border border-neutral-200 p-3"
            >
              <div>
                <p className="text-[14px] font-semibold text-neutral-900">{donor.name}</p>
                <p className="text-[12px] text-neutral-500">{donor.blood_group}</p>
              </div>
              <a
                href={`/api/blood-donors/${donor.id}/contact`}
                className="flex h-9 items-center gap-1.5 rounded-md bg-brand-600 px-3 text-[12px] font-semibold text-white"
              >
                <Phone className="h-3.5 w-3.5" /> যোগাযোগ করুন
              </a>
            </div>
          ))
        )}
      </section>

      <DonorRegistrationSheet
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        districts={districts}
      />
    </div>
  );
}
