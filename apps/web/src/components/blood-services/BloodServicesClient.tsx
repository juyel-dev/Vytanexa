'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, MessageCircle, Copy, Check, Lock } from 'lucide-react';
import { useT } from '@vytanexa/i18n/client';
import { useLocalizedField, useFormatter } from '@/lib/i18n-client';
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
const STOCK_LEGEND_KEYS: [string, 'available' | 'low' | 'unavailable'][] = [
  ['✅', 'available'],
  ['⚠️', 'low'],
  ['❌', 'unavailable'],
];
// BLOOD-SERVICE-PLAN.md Phase A.3 — presence of a stock row is NOT the
// same as it actually being available; a bank with only an
// "unavailable" row for a group must not count as "has that group".
const HAS_STOCK_LEVELS = new Set(['available', 'low']);

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
  initialGroup = null,
  isLoggedIn,
}: {
  bloodBanks: BloodBank[];
  donors: Donor[];
  districts: District[];
  initialGroup?: string | null;
  isLoggedIn: boolean;
}) {
  const t = useT('blood');
  const tc = useT('common');
  const tShared = useT('shared');
  const localize = useLocalizedField();
  const format = useFormatter();
  const router = useRouter();
  const { districtId } = useLocationStore();
  const [bloodBanks, setBloodBanks] = useState(initialBloodBanks);
  const [donors, setDonors] = useState(initialDonors);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(initialGroup);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [isTouch, setIsTouch] = useState(true); // default to the mobile-safe path until we know better
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [revealing, setRevealing] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setIsTouch(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  const districtNameById = useMemo(
    () => new Map(districts.map((d) => [d.id, localize(d.name_translations)])),
    [districts, localize]
  );

  const refetchServices = () => {
    const params = new URLSearchParams();
    if (districtId) params.set('district', districtId);
    if (selectedGroup) params.set('bloodGroup', selectedGroup);
    fetch(`/api/blood-services?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        setBloodBanks(json.bloodBanks ?? []);
        setDonors(json.donors ?? []);
      })
      .catch(() => {});
  };

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

  // BLOOD-SERVICE-PLAN.md Phase A.2/A.3 — compute the *rendered* set
  // once, reuse its length for the header (was bloodBanks.length,
  // uncorrelated with what's actually shown) and its "has stock" check
  // against stock_level (was presence-only, so an "unavailable" row
  // still counted as "has this group").
  const visibleBanks = useMemo(
    () =>
      bloodBanks.filter(
        (b) =>
          !selectedGroup ||
          b.stock.some((s) => s.blood_group === selectedGroup && HAS_STOCK_LEVELS.has(s.stock_level))
      ),
    [bloodBanks, selectedGroup]
  );

  // BLOOD-SERVICE-PLAN.md Phase A.9 — mobile keeps the direct tel:
  // dialer intent; desktop has no dialer, so a top-level nav to a
  // tel: URL just opens a blank tab. Reveal as copyable text instead.
  const handleContact = async (donorId: string) => {
    setContactError(null);
    if (isTouch) {
      window.location.href = `/api/blood-donors/${donorId}/contact`;
      return;
    }
    if (revealed[donorId]) return;
    setRevealing(donorId);
    const res = await fetch(`/api/blood-donors/${donorId}/contact?format=json`).catch(() => null);
    setRevealing(null);
    if (!res || !res.ok) {
      const json = res ? await res.json().catch(() => null) : null;
      setContactError(json?.error ?? t('contactError'));
      return;
    }
    const json = await res.json().catch(() => null);
    if (json?.phone) setRevealed((prev) => ({ ...prev, [donorId]: json.phone }));
  };

  const handleCopy = (donorId: string, phone: string) => {
    navigator.clipboard?.writeText(phone).then(() => {
      setCopiedId(donorId);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  // Login-gate (post-launch decision, see BLOOD-SERVICE-PLAN.md): both
  // registering as a donor and viewing the donor list require a
  // signed-in account. `/auth/login` already supports `returnUrl` and
  // Google sign-in's redirectTo lands back here automatically.
  const goToSignIn = () => router.push('/auth/login?returnUrl=/health/blood-services');
  const handleRegisterClick = () => (isLoggedIn ? setRegisterOpen(true) : goToSignIn());

  return (
    <div className="pb-6">
      <LocationChip />
      <div className="px-4 py-4">
        <h2 className="mb-2.5 text-[14px] font-semibold text-neutral-700">
          {t('selectGroup')}
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
            {t('allGroups')}
          </button>
        </div>
      </div>

      <div className="px-4 py-3">
        <button
          onClick={handleRegisterClick}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-life-600 text-[14px] font-semibold text-white"
        >
          🩸 {t('registerAsDonor')}
        </button>
      </div>

      <section className="px-4 py-4">
        <h2 className="mb-3 text-[15px] font-bold text-neutral-800">
          {t('bloodBanksHeading', { count: visibleBanks.length })}
        </h2>
        {visibleBanks.length === 0 ? (
          <p className="text-[13px] text-neutral-400">{t('noBloodBanks')}</p>
        ) : (
          <>
            <div className="mb-3 flex gap-3 text-[12px] text-neutral-500">
              {STOCK_LEGEND_KEYS.map(([icon, key]) => (
                <span key={key}>
                  {icon} {t(`stock.${key}`)}
                </span>
              ))}
            </div>
            {visibleBanks.map((bank) => {
              const hours = bank.operating_hours as { is_24x7?: boolean } | null;
              return (
                <div
                  key={bank.id}
                  className="mb-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-card"
                >
                  <h3 className="text-[15px] font-bold text-neutral-900">
                    🏥 {localize(bank.name_translations)}
                  </h3>
                  <p className="mt-0.5 text-[13px] text-neutral-500">
                    📍 {bank.address_line}
                    {hours?.is_24x7 && `  ·  🕐 ${t('open24x7')}`}
                  </p>

                  {bank.stock.length > 0 && (
                    <div className="mt-2">
                      <p className="mb-1 text-[12px] text-neutral-500">
                        {t('stock.label')}
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

                  <div className="mt-3 flex gap-2">
                    <a
                      href={`tel:${bank.phone}`}
                      className="flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-emergency-600 text-[13px] font-semibold text-white"
                    >
                      <Phone className="h-4 w-4" /> {t('callNow')}
                    </a>
                    {bank.whatsapp_number && (
                      <a
                        href={`https://wa.me/${bank.whatsapp_number.replace(/[^\d]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-10 w-12 shrink-0 items-center justify-center rounded-md border border-life-600 text-life-600"
                        aria-label="WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </section>

      <section className="border-t border-neutral-100 px-4 py-4">
        <h2 className="mb-3 text-[15px] font-bold text-neutral-800">{t('donorListHeading')}</h2>
        {!isLoggedIn ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-neutral-200 py-6 text-center">
            <Lock className="h-5 w-5 text-neutral-400" />
            <p className="text-[13px] text-neutral-500">
              {t('donorsPrivacyNotice')}
            </p>
            <button
              onClick={goToSignIn}
              className="mt-1 h-10 rounded-md bg-brand-600 px-5 text-[13px] font-semibold text-white"
            >
              {tc('signIn')}
            </button>
          </div>
        ) : filteredDonors.length === 0 ? (
          <p className="text-[13px] text-neutral-400">
            {selectedGroup
              ? t('noDonorsForGroup', { group: selectedGroup })
              : t('noDonorsYet')}
          </p>
        ) : (
          filteredDonors.map((donor) => {
            const revealedPhone = revealed[donor.id];
            return (
            <div
              key={donor.id}
              className="mb-2 flex items-center justify-between rounded-lg border border-neutral-200 p-3"
            >
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-neutral-900">{donor.name}</p>
                <p className="text-[12px] text-neutral-500">
                  {donor.blood_group}
                  {districtNameById.get(donor.location_id) && ` · ${districtNameById.get(donor.location_id)}`}
                  {donor.last_donated_at &&
                    ` · ${t('lastDonated', { date: format.dateTime(new Date(donor.last_donated_at), { day: 'numeric', month: 'short', year: 'numeric' }) })}`}
                </p>
              </div>
              {revealedPhone ? (
                <button
                  onClick={() => handleCopy(donor.id, revealedPhone)}
                  className="flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-neutral-100 px-3 text-[12px] font-semibold text-neutral-800"
                >
                  {copiedId === donor.id ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> {tShared('shareSheet.copied')}
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> {revealedPhone}
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => handleContact(donor.id)}
                  disabled={revealing === donor.id}
                  className="flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-brand-600 px-3 text-[12px] font-semibold text-white disabled:opacity-60"
                >
                  <Phone className="h-3.5 w-3.5" /> {revealing === donor.id ? '...' : t('contactButton')}
                </button>
              )}
            </div>
            );
          })
        )}
        {contactError && <p className="mt-2 text-[12px] text-emergency-600">{contactError}</p>}
      </section>

      <DonorRegistrationSheet
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onSuccess={refetchServices}
        districts={districts}
      />
    </div>
  );
}
