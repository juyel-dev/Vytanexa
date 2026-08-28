'use client';

import Link from 'next/link';

/**
 * Offline Fallback — VYTANEXA-BLUEPRINT.md § S22 "Offline Page (/offline)"
 * Served automatically by next-pwa's `fallbacks.document: '/offline'` when
 * a navigation request fails with no network AND no cache match.
 * Emergency page + national numbers are the guaranteed-functional path,
 * shown prominently here even offline (precached). Client Component so
 * the retry button's `onClick` is allowed (Server Components cannot
 * serialize event handlers per Next.js RSC invariant).
 */
export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-white px-6 py-12 text-center">
      {/* Offline illustration — lightweight inline SVG, no network fetch */}
      <div aria-hidden className="mb-6">
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="60" cy="60" r="54" fill="#EEF4FF" stroke="#1756C8" strokeWidth="1.5" />
          <path d="M40 70 C40 45 80 45 80 70" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />
          <circle cx="48" cy="52" r="6" fill="#94A3B8" />
          <circle cx="72" cy="52" r="6" fill="#94A3B8" />
          <path d="M30 78 L20 88 M90 78 L100 88" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
          <circle cx="60" cy="95" r="10" fill="#FEF2F2" stroke="#DC2626" strokeWidth="1.5" />
          <path d="M60 90 V96 M60 99 H60" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      <h1 className="text-[18px] font-bold text-neutral-900">ইন্টারনেট সংযোগ পাওয়া যাচ্ছে না</h1>
      <p className="mt-2 max-w-[28ch] text-[14px] leading-6 text-neutral-500">
        কিছু তথ্য অফলাইনেও দেখা যেতে পারে।
      </p>

      <div className="mt-6 flex w-full max-w-xs flex-col gap-3">
        <Link
          href="/emergency"
          className="flex h-12 items-center justify-center rounded-md bg-emergency-600 text-[15px] font-semibold text-white"
        >
          🚨 জরুরি নম্বর দেখুন
        </Link>
        <button
          onClick={() => typeof window !== 'undefined' && window.location.reload()}
          className="flex h-12 items-center justify-center rounded-md border border-neutral-200 text-[15px] font-semibold text-neutral-700"
        >
          🔄 আবার চেষ্টা করুন
        </button>
      </div>

      <p className="mt-6 text-[12px] text-neutral-400">
        জাতীয় জরুরি নম্বর (১০২, ১০০, ১০১) সব সময় কল করা যায় — ইন্টারনেট ছাড়াই।
      </p>
    </div>
  );
}
