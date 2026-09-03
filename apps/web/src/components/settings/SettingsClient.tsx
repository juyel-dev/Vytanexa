'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ChevronRight, Trash2 } from 'lucide-react';
import { LanguageSheet } from './LanguageSheet';
import { useLocationStore } from '@/stores/location-store';
import { LANGUAGE_NAMES } from '@/lib/i18n';

// Same code-splitting rationale as LocationChip.tsx: LocationPickerSheet
// pulls in the browser Supabase client for its district/state queries,
// which only matter once the sheet is actually opened. Statically
// importing it here (an earlier version of this file did) pushed
// /settings to 171KB First Load JS -- over the 150KB budget -- exactly
// the same bundle-size lesson as S12's /emergency page.
const LocationPickerSheet = dynamic(
  () => import('@/components/layout/LocationPickerSheet').then((m) => m.LocationPickerSheet),
  { ssr: false }
);

type NotificationPrefs = { general: boolean; emergency: boolean; articles: boolean };

/**
 * Settings — VYTANEXA-BLUEPRINT.md § S18 (`/settings`), "Not
 * Auth-Gated": language/location/privacy work for guests too;
 * notification toggles are the one section that's signed-in-only
 * (spec: "hidden, replaced with 'নোটিফিকেশন পেতে সাইন ইন করুন'
 * prompt row" for guests).
 */
export function SettingsClient({
  isSignedIn,
  initialLanguage,
  initialPrefs,
}: {
  isSignedIn: boolean;
  initialLanguage: string;
  initialPrefs: NotificationPrefs;
}) {
  const { districtName } = useLocationStore();
  const [languageOpen, setLanguageOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [language, setLanguage] = useState(initialLanguage);
  const [prefs, setPrefs] = useState(initialPrefs);
  const [exportSent, setExportSent] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

  const handleToggle = async (key: 'general' | 'articles') => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next); // optimistic, per spec
    await fetch('/api/account/notification-prefs', {
      method: 'PATCH',
      body: JSON.stringify({ [key]: next[key] }),
    }).catch(() => {
      setPrefs(prefs); // revert on network failure
    });
  };

  const handleDataExport = async () => {
    const res = await fetch('/api/account/data-export-request', { method: 'POST' });
    if (res.ok) setExportSent(true);
  };

  /**
   * VYTANEXA-BLUEPRINT.md § S18 "Clear Cache": clears cached data so a
   * misbehaving app can recover. Only `caches.delete()` — never
   * `registration.unregister()`: unregistering would destroy the PWA's
   * offline capability (emergency numbers precache) and force a
   * re-install, which is the opposite of a "fix my app" button.
   */
  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      // best-effort — clearing cache should never surface an error to the user
    }
    setClearingCache(false);
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2500);
  };

  return (
    <div className="pb-8">
      <div className="border-b border-neutral-100 px-4 py-2">
        <SettingsRow
          icon="🌐"
          label="ভাষা"
          value={LANGUAGE_NAMES[language] ?? language}
          onClick={() => setLanguageOpen(true)}
        />
        <SettingsRow
          icon="📍"
          label="ডিফল্ট অবস্থান"
          value={districtName ?? 'নির্বাচন করুন'}
          onClick={() => setLocationOpen(true)}
        />
      </div>

      <div className="border-b border-neutral-100 px-4 py-3">
        <h2 className="mb-2 text-[13px] font-semibold text-neutral-600">🔔 নোটিফিকেশন</h2>
        {isSignedIn ? (
          <>
            <ToggleRow
              label="সাধারণ ঘোষণা"
              checked={prefs.general}
              onChange={() => handleToggle('general')}
            />
            <ToggleRow label="জরুরি সতর্কতা" checked={true} locked />
            <ToggleRow
              label="স্বাস্থ্য টিপস ও আর্টিকেল"
              checked={prefs.articles}
              onChange={() => handleToggle('articles')}
            />
          </>
        ) : (
          <Link
            href="/auth/login"
            className="block rounded-md bg-brand-50 px-3 py-2.5 text-[13px] font-semibold text-brand-700"
          >
            নোটিফিকেশন পেতে সাইন ইন করুন →
          </Link>
        )}
      </div>

      <div className="border-b border-neutral-100 px-4 py-3">
        <h2 className="mb-1 text-[13px] font-semibold text-neutral-600">🔒 প্রাইভেসি</h2>
        <SettingsRow icon="📜" label="শর্তাবলী দেখুন" href="/page/terms" />
        <SettingsRow icon="🔐" label="গোপনীয়তা নীতি দেখুন" href="/page/privacy" />
        {isSignedIn && (
          <button
            onClick={handleDataExport}
            disabled={exportSent}
            className="flex h-[46px] w-full items-center justify-between text-left"
          >
            <span className="text-[14px] text-neutral-800">
              {exportSent ? '✅ অনুরোধ পাঠানো হয়েছে' : 'আমার ডেটা ডাউনলোড করুন'}
            </span>
            {!exportSent && <ChevronRight className="h-4 w-4 text-neutral-300" />}
          </button>
        )}
      </div>

      <div className="px-4 py-3">
        <h2 className="mb-1 text-[13px] font-semibold text-neutral-600">ℹ️ অ্যাপ সম্পর্কে</h2>
        <div className="flex h-[46px] items-center justify-between">
          <span className="text-[14px] text-neutral-800">ভার্সন</span>
          <span className="text-[13px] text-neutral-500">1.0.0</span>
        </div>
        <button
          onClick={handleClearCache}
          disabled={clearingCache}
          className="flex h-[46px] w-full items-center justify-between text-left"
        >
          <span className="flex items-center gap-1.5 text-[14px] text-neutral-800">
            <Trash2 className="h-4 w-4 text-neutral-400" />
            {cacheCleared ? '✅ ক্যাশ পরিষ্কার করা হয়েছে' : 'ক্যাশ পরিষ্কার করুন'}
          </span>
          {!cacheCleared && <ChevronRight className="h-4 w-4 text-neutral-300" />}
        </button>
        <p className="mt-1 text-[11px] text-neutral-400">যদি অ্যাপ ঠিকমতো কাজ না করে</p>
      </div>

      <LanguageSheet
        open={languageOpen}
        onClose={() => setLanguageOpen(false)}
        currentLanguage={language}
        isSignedIn={isSignedIn}
      />
      <LocationPickerSheet open={locationOpen} onClose={() => setLocationOpen(false)} />
    </div>
  );
}

function SettingsRow({
  icon,
  label,
  value,
  href,
  onClick,
}: {
  icon: string;
  label: string;
  value?: string;
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="text-[14px] text-neutral-800">
        {icon} {label}
      </span>
      <span className="flex items-center gap-1 text-[13px] text-neutral-500">
        {value}
        <ChevronRight className="h-4 w-4 text-neutral-300" />
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="flex h-[46px] items-center justify-between">
        {content}
      </Link>
    );
  }
  return (
    <button onClick={onClick} className="flex h-[46px] w-full items-center justify-between">
      {content}
    </button>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  locked,
}: {
  label: string;
  checked: boolean;
  onChange?: () => void;
  locked?: boolean;
}) {
  return (
    <div className="flex h-[42px] items-center justify-between">
      <span className="text-[14px] text-neutral-800">
        {label} {locked && <span className="text-[11px] text-neutral-400">(লক)</span>}
      </span>
      <button
        onClick={locked ? undefined : onChange}
        disabled={locked}
        aria-label={label}
        className={`relative h-6 w-11 rounded-full transition-colors ${
          checked ? 'bg-brand-600' : 'bg-neutral-200'
        } ${locked ? 'opacity-60' : ''}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}
