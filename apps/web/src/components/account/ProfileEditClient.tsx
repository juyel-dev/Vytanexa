'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getLocalizedField } from '@/lib/i18n';
import type { Json } from '@vytanexa/database';

type District = { id: string; slug: string; name_translations: Json };

/**
 * Profile Edit — VYTANEXA-BLUEPRINT.md § S17 "Profile Edit
 * (`/account/profile`)". Phone is read-only (see `/api/account/
 * profile`'s comment for why — changing it needs a real OTP
 * re-verification flow that isn't built yet). Toast-style save
 * confirmation per spec ("field validation, toast confirmation on
 * save") — implemented here as an inline success message rather than
 * a separate toast component, since this app has no shared toast
 * system yet.
 */
export function ProfileEditClient({
  initialName,
  phone,
  initialEmail,
  initialLocationId,
  districts,
}: {
  initialName: string | null;
  phone: string | null;
  initialEmail: string | null;
  initialLocationId: string | null;
  districts: District[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName ?? '');
  const [email, setEmail] = useState(initialEmail ?? '');
  const [locationId, setLocationId] = useState(initialLocationId ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    const res = await fetch('/api/account/profile', {
      method: 'PATCH',
      body: JSON.stringify({
        name,
        email: email || null,
        default_location_id: locationId || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? 'আপডেট করতে সমস্যা হয়েছে');
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="px-4 py-4">
      <label className="mb-1 block text-[13px] font-medium text-neutral-700">নাম *</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mb-4 h-11 w-full rounded-md border border-neutral-200 px-3 text-[14px]"
      />

      <label className="mb-1 block text-[13px] font-medium text-neutral-700">মোবাইল নম্বর</label>
      <input
        value={phone ?? ''}
        disabled
        className="mb-1 h-11 w-full rounded-md border border-neutral-100 bg-neutral-50 px-3 text-[14px] text-neutral-500"
      />
      <p className="mb-4 text-[11px] text-neutral-400">
        নম্বর পরিবর্তন করতে OTP যাচাইকরণ প্রয়োজন (শীঘ্রই আসছে)
      </p>

      <label className="mb-1 block text-[13px] font-medium text-neutral-700">ইমেইল (ঐচ্ছিক)</label>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        className="mb-4 h-11 w-full rounded-md border border-neutral-200 px-3 text-[14px]"
      />

      <label className="mb-1 block text-[13px] font-medium text-neutral-700">
        ডিফল্ট অবস্থান
      </label>
      <select
        value={locationId}
        onChange={(e) => setLocationId(e.target.value)}
        className="mb-4 h-11 w-full rounded-md border border-neutral-200 px-3 text-[14px]"
      >
        <option value="">নির্বাচন করুন</option>
        {districts.map((d) => (
          <option key={d.id} value={d.id}>
            {getLocalizedField(d.name_translations)}
          </option>
        ))}
      </select>

      {error && <p className="mb-2 text-[12px] text-emergency-600">{error}</p>}
      {saved && <p className="mb-2 text-[13px] font-medium text-life-600">✅ সংরক্ষণ করা হয়েছে</p>}

      <button
        onClick={handleSave}
        disabled={saving || name.trim().length < 2}
        className="h-12 w-full rounded-md bg-brand-600 text-[15px] font-semibold text-white disabled:opacity-40"
      >
        {saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
      </button>
    </div>
  );
}
