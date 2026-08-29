'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import {
  LOCATION_TYPE_LABEL,
  autoSlug,
  slugify,
  locationName,
  type AdminLocation,
  type LocationType,
} from '@/lib/location-utils';

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  parent: AdminLocation | null;
  locationToEdit?: AdminLocation | null;
  onClose: () => void;
  onSaved: () => void;
};

function Field({
  label,
  children,
  hint,
  required,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-admin-h3 text-neutral-700">
        {label} {required && <span className="text-emergency-600">*</span>}
      </span>
      {children}
      {hint && <span className="text-admin-small text-neutral-400">{hint}</span>}
    </label>
  );
}

export function LocationModal({ open, mode, parent, locationToEdit, onClose, onSaved }: Props) {
  const isEdit = mode === 'edit';
  const target = isEdit ? locationToEdit : null;

  const lockedType: LocationType = useMemo(() => {
    if (isEdit && target) return target.type;
    if (parent) {
      const map: Record<LocationType, LocationType | null> = {
        state: 'district',
        district: 'sub_district',
        sub_district: 'ward',
        ward: null,
      };
      return (parent.type ? map[parent.type] : 'state') ?? 'state';
    }
    return 'state';
  }, [isEdit, target, parent]);

  const [nameBn, setNameBn] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nameHi, setNameHi] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // hydrate when opening / switching target
  useEffect(() => {
    if (!open) return;
    if (isEdit && target) {
      const t = (target.name_translations ?? {}) as { bn?: string; en?: string; hi?: string };
      setNameBn(t.bn ?? '');
      setNameEn(t.en ?? '');
      setNameHi(t.hi ?? '');
      setSlug(target.slug ?? '');
      setSlugTouched(true);
      setLatitude(target.latitude != null ? String(target.latitude) : '');
      setLongitude(target.longitude != null ? String(target.longitude) : '');
      setIsActive(target.is_active);
    } else {
      setNameBn('');
      setNameEn('');
      setNameHi('');
      setSlug('');
      setSlugTouched(false);
      setLatitude('');
      setLongitude('');
      setIsActive(true);
    }
    setError(null);
    setBusy(false);
  }, [open, isEdit, target]);

  // auto-slug while the field hasn't been hand-edited
  useEffect(() => {
    if (slugTouched) return;
    const next = autoSlug(nameBn, nameEn);
    if (next) setSlug(next);
  }, [nameBn, nameEn, slugTouched]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const payload: Record<string, unknown> = {
      type: lockedType,
      name_translations: { bn: nameBn.trim(), en: nameEn.trim(), hi: nameHi.trim() },
      slug: slug.trim() ? slugify(slug.trim()) : undefined,
      latitude: latitude.trim() === '' ? null : Number(latitude),
      longitude: longitude.trim() === '' ? null : Number(longitude),
      is_active: isActive,
    };
    if (!isEdit) {
      payload.parent_id = parent?.id ?? null;
    }

    const url = isEdit && target ? `/api/admin/locations/${target.id}` : '/api/admin/locations';
    const method = isEdit ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => null);

    setBusy(false);
    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => null) : null;
      setError(data?.error ?? 'সংরক্ষণ করা যায়নি — আবার চেষ্টা করুন');
      return;
    }
    onSaved();
    onClose();
  };

  const parentLabel = parent ? locationName(parent) : null;

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" aria-hidden onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-admin-border bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-admin-border px-5 py-3">
          <h2 className="text-admin-h2 text-neutral-900">
            {isEdit ? 'এলাকা সম্পাদনা' : 'নতুন এলাকা যোগ করুন'}
          </h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-neutral-500 hover:bg-neutral-50" aria-label="বন্ধ করুন">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
          {/* locked type + parent — never editable here */}
          <div className="rounded-lg bg-neutral-50 px-3 py-2 text-admin-body">
            <p>
              <span className="font-medium text-neutral-700">ধরন:</span>{' '}
              <span className="text-neutral-900">{LOCATION_TYPE_LABEL[lockedType]}</span>
              <span className="ml-2 text-admin-small text-neutral-400">← locked</span>
            </p>
            {parentLabel && (
              <p className="mt-1">
                <span className="font-medium text-neutral-700">প্যারেন্ট:</span>{' '}
                <span className="text-neutral-900">{parentLabel}</span>
                <span className="ml-2 text-admin-small text-neutral-400">← locked</span>
              </p>
            )}
            {!parentLabel && lockedType === 'state' && (
              <p className="mt-1 text-admin-small text-neutral-500">এটি একটি State — কোনো প্যারেন্ট নেই।</p>
            )}
          </div>

          <Field label="নাম (বাংলা)" required hint="যেমন: পশ্চিমবঙ্গ, কোচবিহার">
            <input
              value={nameBn}
              onChange={(e) => setNameBn(e.target.value)}
              required
              placeholder="বাংলা নাম"
              className="h-10 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </Field>

          <Field label="Name (English)" hint="Used as slug fallback if you don't type a slug">
            <input
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="English name"
              className="h-10 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </Field>

          <Field label="नाम (हिन्दी)">
            <input
              value={nameHi}
              onChange={(e) => setNameHi(e.target.value)}
              placeholder="हिन्दी नाम"
              className="h-10 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </Field>

          <Field label="স্লাগ (URL)" hint="SEO URL-এ ব্যবহৃত হয় — ফাঁকা রাখলে নাম থেকে স্বয়ংক্রিয়ভাবে তৈরি হবে">
            <div className="flex gap-2">
              <input
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugTouched(true);
                }}
                placeholder="auto-generated"
                className="h-10 flex-1 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              />
              <button
                type="button"
                onClick={() => {
                  const next = autoSlug(nameBn, nameEn);
                  if (next) setSlug(next);
                  setSlugTouched(false);
                }}
                className="h-10 shrink-0 rounded-md border border-admin-border px-3 text-admin-small font-medium text-neutral-600 hover:bg-neutral-50"
              >
                পুনরায় তৈরি
              </button>
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="অক্ষাংশ (ঐচ্ছিক)">
              <input
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                inputMode="decimal"
                placeholder="22.57"
                className="h-10 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              />
            </Field>
            <Field label="দ্রাঘিমাংশ (ঐচ্ছিক)">
              <input
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                inputMode="decimal"
                placeholder="88.36"
                className="h-10 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-admin-body text-neutral-700">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-admin-border" />
            সক্রিয় (Active — অ্যাপে দেখাবে)
          </label>

          {error && <p className="rounded-md bg-emergency-50 px-3 py-2 text-admin-body text-emergency-700">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-admin-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-10 rounded-md border border-admin-border px-4 text-admin-body font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            বাতিল
          </button>
          <button
            type="submit"
            disabled={busy || !nameBn.trim()}
            className="h-10 rounded-md bg-brand-600 px-5 text-admin-body font-semibold text-white hover:bg-brand-700 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            {busy ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
          </button>
        </div>
      </form>
    </div>
  );
}
