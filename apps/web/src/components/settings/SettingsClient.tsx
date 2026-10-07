'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ChevronRight, Trash2 } from 'lucide-react';
import { LanguageSheet } from './LanguageSheet';
import { useLocationNames } from '@/lib/use-location-names';
import { LANGUAGE_NAMES, useResolvedLocale } from '@/lib/i18n-client';
import { useT } from '@vytanexa/i18n/client';
import { useAuthMethods } from '@/lib/use-auth-methods';

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
  initialPrefs,
}: {
  isSignedIn: boolean;
  initialPrefs: NotificationPrefs;
}) {
  const { districtName } = useLocationNames();
  const t = useT('settings');
  const tCommon = useT('common');
  const [languageOpen, setLanguageOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  // The language row used to show a value frozen at first render (and the
  // profile's preferred_language, which for guests is always 'bn'): after
  // switching language it kept the OLD name until a hard reload. The
  // resolved locale (cookie-driven) is the real current language.
  const language = useResolvedLocale();
  const authMethods = useAuthMethods();
  const signInAvailable = !!authMethods && (authMethods.phone || authMethods.google);
  const [prefs, setPrefs] = useState(initialPrefs);
  const [exportSent, setExportSent] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportFailed, setExportFailed] = useState(false);
  const [toggleError, setToggleError] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

  const handleToggle = async (key: 'general' | 'articles') => {
    const nextValue = !prefs[key];
    setToggleError(false);
    // Optimistic per spec. Functional updates so two quick toggles don't
    // overwrite each other from a stale `prefs` closure, and each failure
    // reverts only ITS key.
    setPrefs((p) => ({ ...p, [key]: nextValue }));
    try {
      const res = await fetch('/api/account/notification-prefs', {
        method: 'PATCH',
        body: JSON.stringify({ [key]: nextValue }),
      });
      // Previously only a *network* failure reverted: a 4xx/5xx left the
      // switch showing a state the server never saved.
      if (!res.ok) throw new Error(`status ${res.status}`);
    } catch {
      setPrefs((p) => ({ ...p, [key]: !nextValue }));
      setToggleError(true);
    }
  };

  const handleDataExport = async () => {
    if (exporting) return;
    setExporting(true);
    setExportFailed(false);
    // try/catch: a network error was an unhandled rejection with no
    // feedback, and rapid taps queued duplicate requests.
    try {
      const res = await fetch('/api/account/data-export-request', { method: 'POST' });
      if (!res.ok) throw new Error(`status ${res.status}`);
      setExportSent(true);
    } catch {
      setExportFailed(true);
    } finally {
      setExporting(false);
    }
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
          label={t('language')}
          value={LANGUAGE_NAMES[language] ?? language}
          onClick={() => setLanguageOpen(true)}
        />
        <SettingsRow
          icon="📍"
          label={t('location')}
          value={districtName ?? tCommon('select')}
          onClick={() => setLocationOpen(true)}
        />
      </div>

      <div className="border-b border-neutral-100 px-4 py-3">
        <h2 className="mb-2 text-[13px] font-semibold text-neutral-600">🔔 {t('notifications')}</h2>
        {isSignedIn ? (
          <>
            <ToggleRow
              label={t('notifGeneral')}
              checked={prefs.general}
              onChange={() => handleToggle('general')}
            />
            <ToggleRow label={t('notifEmergency')} checked={true} locked />
            <ToggleRow
              label={t('notifArticles')}
              checked={prefs.articles}
              onChange={() => handleToggle('articles')}
            />
            {toggleError && (
              <p className="mt-1 text-[12px] text-emergency-600">{tCommon('error')}</p>
            )}
          </>
        ) : signInAvailable ? (
          <Link
            href="/auth/login"
            className="block rounded-md bg-brand-50 px-3 py-2.5 text-[13px] font-semibold text-brand-700"
          >
            {t('signInForNotifications')}
          </Link>
        ) : null}
      </div>

      <div className="border-b border-neutral-100 px-4 py-3">
        <h2 className="mb-1 text-[13px] font-semibold text-neutral-600">🔒 {t('privacy')}</h2>
        <SettingsRow icon="📜" label={t('viewTerms')} href="/page/terms" />
        <SettingsRow icon="🔐" label={t('viewPrivacyPolicy')} href="/page/privacy" />
        {isSignedIn && (
          <button
            onClick={handleDataExport}
            disabled={exportSent || exporting}
            className="flex h-[46px] w-full items-center justify-between text-left"
          >
            <span className="text-[14px] text-neutral-800">
              {exportSent ? t('exportRequestSent') : t('downloadMyData')}
            </span>
            {!exportSent && <ChevronRight className="h-4 w-4 text-neutral-300" />}
          </button>
        )}
        {exportFailed && <p className="text-[12px] text-emergency-600">{tCommon('error')}</p>}
      </div>

      <div className="px-4 py-3">
        <h2 className="mb-1 text-[13px] font-semibold text-neutral-600">ℹ️ {t('about')}</h2>
        <div className="flex h-[46px] items-center justify-between">
          <span className="text-[14px] text-neutral-800">{t('version')}</span>
          <span className="text-[13px] text-neutral-500">1.0.0</span>
        </div>
        <button
          onClick={handleClearCache}
          disabled={clearingCache}
          className="flex h-[46px] w-full items-center justify-between text-left"
        >
          <span className="flex items-center gap-1.5 text-[14px] text-neutral-800">
            <Trash2 className="h-4 w-4 text-neutral-400" />
            {cacheCleared ? t('cacheCleared') : t('clearCache')}
          </span>
          {!cacheCleared && <ChevronRight className="h-4 w-4 text-neutral-300" />}
        </button>
        <p className="mt-1 text-[11px] text-neutral-400">{t('clearCacheHint')}</p>
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
  const t = useT('settings');
  return (
    <div className="flex h-[42px] items-center justify-between">
      <span className="text-[14px] text-neutral-800">
        {label} {locked && <span className="text-[11px] text-neutral-400">{t('locked')}</span>}
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
