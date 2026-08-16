'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  customPages,
  showQA,
  hasUnreadNotifications,
}: {
  currentUser: CurrentUserView;
  customPages: CustomPageLink[];
  showQA: boolean;
  hasUnreadNotifications: boolean;
}) {
  const router = useRouter();
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
              স্বাগতম, {currentUser.name ?? 'ব্যবহারকারী'}!
            </p>
            {currentUser.phone && (
              <p className="text-[13px] text-neutral-500">{currentUser.phone}</p>
            )}
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300" />
        </Link>
      ) : (
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-4">
          <p className="text-[15px] font-semibold text-neutral-700">অতিথি হিসেবে ব্যবহার করছেন</p>
          <Link
            href="/auth/login"
            className="rounded-full bg-brand-50 px-4 py-2 text-[13px] font-semibold text-brand-700"
          >
            সাইন ইন
          </Link>
        </div>
      )}

      {currentUser && (
        <MenuSection title="আমার অ্যাকাউন্ট">
          <MenuRow href="/account/favorites" icon={Heart} label="পছন্দের তালিকা" />
          <MenuRow href="/account" icon={User} label="প্রোফাইল" />
          <MenuRow href="/account/history" icon={ClipboardList} label="অ্যাপয়েন্টমেন্ট হিস্টরি" />
        </MenuSection>
      )}

      <MenuSection title="স্বাস্থ্য টুলস">
        <MenuRow href="/symptoms" icon={Stethoscope} label="উপসর্গ দেখুন" />
        <MenuRow href="/health/lab-tests" icon={FlaskConical} label="ল্যাব টেস্ট" />
        <MenuRow href="/health/blood-services" icon={Droplet} label="ব্লাড সার্ভিস" />
        <MenuRow href="/emergency" icon={Siren} label="জরুরি সেবা" />
      </MenuSection>

      <MenuSection title="কমিউনিটি">
        <MenuRow href="/community/articles" icon={Newspaper} label="স্বাস্থ্য ম্যাগাজিন" />
        {showQA && <MenuRow href="/community/qa" icon={HelpCircle} label="প্রশ্নোত্তর" />}
        <MenuRow href="/community/polls" icon={BarChart3} label="জরিপ" />
      </MenuSection>

      {customPages.length > 0 && (
        <MenuSection title="তথ্য">
          {customPages.map((page) => {
            const Icon = CUSTOM_PAGE_ICONS[page.menu_icon as MenuIconKey] ?? Globe;
            return (
              <MenuRow key={page.slug} href={`/page/${page.slug}`} icon={Icon} label={page.title} />
            );
          })}
        </MenuSection>
      )}

      <MenuSection title="সেটিংস">
        <MenuRow href="/settings" icon={Globe} label="ভাষা" value="বাংলা" />
        <MenuRow href="/settings" icon={MapPin} label="অবস্থান" />
        <MenuRow
          href="/notifications"
          icon={Bell}
          label="নোটিফিকেশন"
          showDot={hasUnreadNotifications}
        />
        <MenuRow href="/settings" icon={Lock} label="প্রাইভেসি" />
      </MenuSection>

      <MenuSection title="সহায়তা">
        <MenuRow href="/page/support" icon={MessageCircle} label="সাপোর্ট" />
        <MenuRow href="/page/terms" icon={ScrollText} label="শর্তাবলী" />
        <MenuRow href="/page/privacy" icon={ShieldCheck} label="গোপনীয়তা নীতি" />
      </MenuSection>

      {currentUser && (
        <div className="px-4 py-4">
          <button
            onClick={() => setConfirmSignOut(true)}
            className="h-11 w-full rounded-md border border-emergency-200 text-[14px] font-semibold text-emergency-600"
          >
            সাইন আউট
          </button>
        </div>
      )}

      <p className="py-4 text-center text-[12px] text-neutral-400">Vytanexa v{APP_VERSION}</p>

      {confirmSignOut && (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-sm rounded-xl bg-white p-5">
            <p className="mb-4 text-center text-[15px] font-semibold text-neutral-900">
              আপনি কি সাইন আউট করতে চান?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmSignOut(false)}
                className="h-11 flex-1 rounded-md border border-neutral-200 text-[14px] font-semibold text-neutral-700"
              >
                বাতিল
              </button>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="h-11 flex-1 rounded-md bg-emergency-600 text-[14px] font-semibold text-white disabled:opacity-60"
              >
                {signingOut ? '...' : 'সাইন আউট'}
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
