'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@vytanexa/i18n/client';
import { useLocalizedField } from '@/lib/i18n-client';
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
  const t = useT('account.profile');
  const tc = useT('common');
  const localize = useLocalizedField();
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
      setError(json.error ?? t('updateFailed'));
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="px-4 py-4">
      <label className="mb-1 block text-[13px] font-medium text-neutral-700">{tc('yourName')}</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mb-4 h-11 w-full rounded-md border border-neutral-200 px-3 text-[14px]"
      />

      <label className="mb-1 block text-[13px] font-medium text-neutral-700">{t('phoneLabel')}</label>
      <input
        value={phone ?? ''}
        disabled
        className="mb-1 h-11 w-full rounded-md border border-neutral-100 bg-neutral-50 px-3 text-[14px] text-neutral-500"
      />
      <p className="mb-4 text-[11px] text-neutral-400">
        {t('phoneReadonlyNotice')}
      </p>

      <label className="mb-1 block text-[13px] font-medium text-neutral-700">{t('emailLabel')}</label>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        className="mb-4 h-11 w-full rounded-md border border-neutral-200 px-3 text-[14px]"
      />

      <label className="mb-1 block text-[13px] font-medium text-neutral-700">
        {t('locationLabel')}
      </label>
      <select
        value={locationId}
        onChange={(e) => setLocationId(e.target.value)}
        className="mb-4 h-11 w-full rounded-md border border-neutral-200 px-3 text-[14px]"
      >
        <option value="">{tc('select')}</option>
        {districts.map((d) => (
          <option key={d.id} value={d.id}>
            {localize(d.name_translations)}
          </option>
        ))}
      </select>

      {error && <p className="mb-2 text-[12px] text-emergency-600">{error}</p>}
      {saved && <p className="mb-2 text-[13px] font-medium text-life-600">{t('saved')}</p>}

      <button
        onClick={handleSave}
        disabled={saving || name.trim().length < 2}
        className="h-12 w-full rounded-md bg-brand-600 text-[15px] font-semibold text-white disabled:opacity-40"
      >
        {saving ? t('saving') : tc('save')}
      </button>
    </div>
  );
}
