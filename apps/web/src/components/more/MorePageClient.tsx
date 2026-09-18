'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocationStore } from '@/stores/location-store';
import { LANGUAGE_NAMES } from '@/lib/i18n-client';
import { useT } from '@vytanexa/i18n/client';
import {
  Heart,
  User,
  ClipboardList,
  Stethoscope,
  FlaskConical,
  Droplet,
  Siren,
  Newspaper,
  HelpCircle,
  BarChart3,
  Globe,
  MapPin,
  Bell,
  Lock,
  MessageCircle,
  ScrollText,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

type MenuIconKey = keyof typeof CUSTOM_PAGE_ICONS;
const CUSTOM_PAGE_ICONS = { ScrollText, ShieldCheck, MessageCircle, Globe } as const;

type CurrentUserView = {
  name: string | null;
  phone: string | null;
} | null;

type CustomPageLink = { slug: string; title: string; menu_icon: string | null };

const APP_VERSION = '1.0.0';

/**
 * More Page — VYTANEXA-BLUEPRINT.md § S16. Grouped sections exactly
 * per the spec's mockup: account, health tools, community, custom
 * pages (data-driven, admin-extensible), settings, support. Server
 * Component (`app/(main)/more/page.tsx`) resolves auth state and
 * passes it down — this client component only needs interactivity
 * for the sign-out confirm dialog, so it stays deliberately light
 * (no direct Supabase import — see `/api/auth/signout`'s comment).
 */
export function MorePageClient({
  currentUser,
  language,
  customPages,
  showQA,
  showPolls,
  hasUnreadNotifications,
}: {
  currentUser: CurrentUserView;
  language: string;
  customPages: CustomPageLink[];
  showQA: boolean;
  showPolls: boolean;
  hasUnreadNotifications: boolean;
}) {
  const router = useRouter();
  const t = useT('more');
  const tc = useT('common');
  const tAccount = useT('account');
  const tSettings = useT('settings');
  const tEmergency = useT('emergency');
  const tHome = useT('home');
  const tQa = useT('qa');
  // TODO.md Phase 9.2: the "ভাষা"/"অবস্থান" rows below used to show a
  // hardcoded "বাংলা" and no value at all, respectively — regardless
  // of what the user had actually set. `language` comes from the
  // server (users.preferred_language, same source SettingsClient.tsx
  // uses); `districtName` is read the same way SettingsClient reads
  // it — client-side from the location store, since that (not
  // users.default_location_id, a separate account-profile field) is
  // the "current active location" concept used app-wide.
  const { districtName } = useLocationStore();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await fetch('/api/auth/signout', { method: 'POST' });
    setSigningOut(false);
    setConfirmSignOut(false);
    router.refresh();
  };

  return (
    <div className="pb-8">
      {/* Account header */}
      {currentUser ? (
        <Link
          href="/account"
          className="flex items-center gap-3 border-b border-neutral-100 px-4 py-4"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[18px] font-bold text-brand-700">
            {currentUser.name ? currentUser.name.charAt(0) : '👤'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-neutral-900">
              {t('welcome', { name: currentUser.name ?? tAccount('defaultUserName') })}
            </p>
            {currentUser.phone && (
              <p className="text-[13px] text-neutral-500">{currentUser.phone}</p>
            )}
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300" />
        </Link>
      ) : (
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-4">
          <p className="text-[15px] font-semibold text-neutral-700">{t('guestMode')}</p>
          <Link
            href="/auth/login"
            className="rounded-full bg-brand-50 px-4 py-2 text-[13px] font-semibold text-brand-700"
          >
            {t('signIn')}
          </Link>
        </div>
      )}

      {currentUser && (
        <MenuSection title={tAccount('pageTitle')}>
          <MenuRow href="/account/favorites" icon={Heart} label={tAccount('rows.favorites')} />
          <MenuRow href="/account" icon={User} label={t('profile')} />
          <MenuRow href="/account/history" icon={ClipboardList} label={tAccount('rows.appointmentHistory')} />
        </MenuSection>
      )}

      <MenuSection title={t('sections.healthTools')}>
        <MenuRow href="/symptoms" icon={Stethoscope} label={t('symptoms')} />
        <MenuRow href="/health/lab-tests" icon={FlaskConical} label={t('labTests')} />
        <MenuRow href="/health/blood-services" icon={Droplet} label={tEmergency('fab.bloodService')} />
        <MenuRow href="/emergency" icon={Siren} label={tEmergency('pageTitle')} />
      </MenuSection>

      <MenuSection title={t('sections.community')}>
        <MenuRow href="/community/articles" icon={Newspaper} label={tHome('sectionLabels.articles')} />
        {showQA && <MenuRow href="/community/qa" icon={HelpCircle} label={tQa('heading')} />}
        {showPolls && <MenuRow href="/community/polls" icon={BarChart3} label={t('polls')} />}
      </MenuSection>

      {customPages.length > 0 && (
        <MenuSection title={t('sections.info')}>
          {customPages.map((page) => {
            const Icon = CUSTOM_PAGE_ICONS[page.menu_icon as MenuIconKey] ?? Globe;
            return (
              <MenuRow key={page.slug} href={`/page/${page.slug}`} icon={Icon} label={page.title} />
            );
          })}
        </MenuSection>
      )}

      <MenuSection title={tSettings('title')}>
        <MenuRow href="/settings" icon={Globe} label={tSettings('language')} value={LANGUAGE_NAMES[language] ?? language} />
        <MenuRow href="/settings" icon={MapPin} label={tSettings('location')} value={districtName ?? tc('select')} />
        <MenuRow
          href="/notifications"
          icon={Bell}
          label={tc('notifications')}
          showDot={hasUnreadNotifications}
        />
        <MenuRow href="/settings" icon={Lock} label={tSettings('privacy')} />
      </MenuSection>

      <MenuSection title={t('sections.support')}>
        <MenuRow href="/page/support" icon={MessageCircle} label={t('support')} />
        <MenuRow href="/page/terms" icon={ScrollText} label={t('terms')} />
        <MenuRow href="/page/privacy" icon={ShieldCheck} label={t('privacyPolicy')} />
      </MenuSection>

      {currentUser && (
        <div className="px-4 py-4">
          <button
            onClick={() => setConfirmSignOut(true)}
            className="h-11 w-full rounded-md border border-emergency-200 text-[14px] font-semibold text-emergency-600"
          >
            {t('signOut')}
          </button>
        </div>
      )}

      <p className="py-4 text-center text-[12px] text-neutral-400">{t('appVersion', { version: APP_VERSION })}</p>

      {confirmSignOut && (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-sm rounded-xl bg-white p-5">
            <p className="mb-4 text-center text-[15px] font-semibold text-neutral-900">
              {t('signOutConfirm')}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmSignOut(false)}
                className="h-11 flex-1 rounded-md border border-neutral-200 text-[14px] font-semibold text-neutral-700"
              >
                {tc('cancel')}
              </button>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="h-11 flex-1 rounded-md bg-emergency-600 text-[14px] font-semibold text-white disabled:opacity-60"
              >
                {signingOut ? '...' : t('signOut')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-neutral-100 px-4 py-3">
      <h2 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-neutral-400">
        {title}
      </h2>
      {children}
    </div>
  );
}

function MenuRow({
  href,
  icon: Icon,
  label,
  value,
  showDot,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
  showDot?: boolean;
}) {
  return (
    <Link href={href} className="flex h-[52px] items-center gap-3 active:bg-neutral-50">
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50">
        <Icon className="h-[22px] w-[22px] text-brand-600" />
        {showDot && (
          <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-emergency-600" />
        )}
      </span>
      <span className="flex-1 text-[15px] font-medium text-neutral-800">{label}</span>
      {value && <span className="text-[13px] text-neutral-500">{value}</span>}
      <ChevronRight className="h-4 w-4 text-neutral-300" />
    </Link>
  );
}
