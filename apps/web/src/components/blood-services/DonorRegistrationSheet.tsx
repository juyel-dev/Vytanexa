'use client';

import { useState } from 'react';
import { useT } from '@vytanexa/i18n/client';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useLocalizedField } from '@/lib/i18n-client';
import { normalizeIndianPhone } from '@/lib/validations/blood-donors';
import type { Json } from '@vytanexa/database';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

type District = { id: string; slug: string; name_translations: Json };

/**
 * Donor Registration — VYTANEXA-BLUEPRINT.md § S11 "Donor Registration
 * (Opt-in Directory)". Both checkboxes are mandatory before submit:
 * eligibility self-declaration (WHO's 3-month interval — client-side
 * gate only, see `/api/blood-donors` route comment for why it isn't
 * persisted) and contact consent (`consent_contact`, persisted and
 * DB-enforced via `chk_donor_consent`).
 *
 * BLOOD-SERVICE-PLAN.md Phase A.1/A.6 — phone check now runs the same
 * `normalizeIndianPhone` the server uses (was a bare 10-digit regex
 * here vs. a stricter server rule, so "+91XXXXXXXXXX" — literally the
 * placeholder text — got rejected on submit). `onSuccess` lets the
 * parent refetch the donor list instead of the new donor only showing
 * up after a manual reload.
 */
export function DonorRegistrationSheet({
  open,
  onClose,
  onSuccess,
  districts,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  districts: District[];
}) {
  const t = useT('blood.registration');
  const tc = useT('common');
  const localize = useLocalizedField();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [eligible, setEligible] = useState(false);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canSubmit =
    name.trim().length >= 2 &&
    /^[6-9]\d{9}$/.test(normalizeIndianPhone(phone)) &&
    bloodGroup &&
    districtId &&
    eligible &&
    consent;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch('/api/blood-donors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        phone: normalizeIndianPhone(phone),
        blood_group: bloodGroup,
        location_id: districtId,
        consent_contact: consent,
      }),
    }).catch(() => null);
    setSubmitting(false);
    if (!res || !res.ok) {
      const json = res ? await res.json().catch(() => null) : null;
      setError(json?.error ?? t('submitFailed'));
      return;
    }
    setSuccess(true);
    onSuccess?.();
    setTimeout(() => {
      onClose();
      setSuccess(false);
      setName('');
      setPhone('');
      setBloodGroup('');
      setDistrictId('');
      setEligible(false);
      setConsent(false);
    }, 1800);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={t('sheetTitle')}>
      {success ? (
        <p className="py-8 text-center text-[15px] font-semibold text-life-600">
          {t('successMessage')}
        </p>
      ) : (
        <>
          <label className="mb-1 block text-[13px] font-medium text-neutral-700">{tc('yourName')}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mb-3 h-11 w-full rounded-md border border-neutral-200 px-3 text-[14px]"
          />

          <label className="mb-1 block text-[13px] font-medium text-neutral-700">
            {t('phoneLabel')}
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            placeholder={t('phonePlaceholder')}
            className="mb-3 h-11 w-full rounded-md border border-neutral-200 px-3 text-[14px]"
          />

          <label className="mb-1 block text-[13px] font-medium text-neutral-700">
            {t('bloodGroupLabel')}
          </label>
          <div className="mb-3 grid grid-cols-4 gap-2">
            {BLOOD_GROUPS.map((bg) => (
              <button
                key={bg}
                onClick={() => setBloodGroup(bg)}
                className={`h-10 rounded-md border text-[13px] font-semibold ${
                  bloodGroup === bg
                    ? 'border-emergency-600 bg-emergency-600 text-white'
                    : 'border-neutral-200 text-neutral-700'
                }`}
              >
                {bg}
              </button>
            ))}
          </div>

          <label className="mb-1 block text-[13px] font-medium text-neutral-700">{t('districtLabel')}</label>
          <select
            value={districtId}
            onChange={(e) => setDistrictId(e.target.value)}
            className="mb-4 h-11 w-full rounded-md border border-neutral-200 px-3 text-[14px]"
          >
            <option value="">{tc('select')}</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {localize(d.name_translations)}
              </option>
            ))}
          </select>

          <label className="mb-2 flex items-start gap-2 text-[13px] text-neutral-700">
            <input
              type="checkbox"
              checked={eligible}
              onChange={(e) => setEligible(e.target.checked)}
              className="mt-0.5"
            />
            <span>{t('eligibilityLabel')}</span>
          </label>

          <label className="mb-4 flex items-start gap-2 text-[13px] text-neutral-700">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5"
            />
            <span>{t('consentLabel')}</span>
          </label>

          {error && <p className="mb-2 text-[12px] text-emergency-600">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="h-12 w-full rounded-md bg-emergency-600 text-[15px] font-semibold text-white disabled:opacity-40"
          >
            {submitting ? t('submitting') : t('submit')}
          </button>
        </>
      )}
    </BottomSheet>
  );
}
