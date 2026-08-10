'use client';

import { useState } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { getLocalizedField } from '@/lib/i18n';
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
 */
export function DonorRegistrationSheet({
  open,
  onClose,
  districts,
}: {
  open: boolean;
  onClose: () => void;
  districts: District[];
}) {
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
    /^[0-9+]{10,14}$/.test(phone.trim()) &&
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
      body: JSON.stringify({
        name,
        phone: phone.trim(),
        blood_group: bloodGroup,
        location_id: districtId,
        consent_contact: consent,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? 'নিবন্ধন করতে সমস্যা হয়েছে');
      return;
    }
    setSuccess(true);
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
    <BottomSheet open={open} onClose={onClose} title="রক্তদাতা হিসেবে নাম লেখান">
      {success ? (
        <p className="py-8 text-center text-[15px] font-semibold text-life-600">
          ✅ ধন্যবাদ! আপনি রক্তদাতা তালিকায় যুক্ত হয়েছেন
        </p>
      ) : (
        <>
          <label className="mb-1 block text-[13px] font-medium text-neutral-700">নাম *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mb-3 h-11 w-full rounded-md border border-neutral-200 px-3 text-[14px]"
          />

          <label className="mb-1 block text-[13px] font-medium text-neutral-700">
            মোবাইল নম্বর *
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            placeholder="+91XXXXXXXXXX"
            className="mb-3 h-11 w-full rounded-md border border-neutral-200 px-3 text-[14px]"
          />

          <label className="mb-1 block text-[13px] font-medium text-neutral-700">
            রক্তের গ্রুপ *
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

          <label className="mb-1 block text-[13px] font-medium text-neutral-700">জেলা *</label>
          <select
            value={districtId}
            onChange={(e) => setDistrictId(e.target.value)}
            className="mb-4 h-11 w-full rounded-md border border-neutral-200 px-3 text-[14px]"
          >
            <option value="">নির্বাচন করুন</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {getLocalizedField(d.name_translations)}
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
            <span>শেষ রক্তদান ৩ মাসের বেশি আগে হয়েছে (WHO নির্দেশিকা অনুযায়ী)</span>
          </label>

          <label className="mb-4 flex items-start gap-2 text-[13px] text-neutral-700">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5"
            />
            <span>আমি জরুরি প্রয়োজনে যোগাযোগ পেতে সম্মত</span>
          </label>

          {error && <p className="mb-2 text-[12px] text-emergency-600">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="h-12 w-full rounded-md bg-emergency-600 text-[15px] font-semibold text-white disabled:opacity-40"
          >
            {submitting ? 'নিবন্ধন হচ্ছে...' : 'নিবন্ধন করুন'}
          </button>
        </>
      )}
    </BottomSheet>
  );
}
