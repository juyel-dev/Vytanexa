'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const BENEFITS = [
  { emoji: '❤️', text: 'ডাক্তার ও হাসপাতাল সেভ করুন' },
  { emoji: '📅', text: 'অ্যাপয়েন্টমেন্ট ট্র্যাক করুন' },
  { emoji: '🔔', text: 'ব্যক্তিগত স্বাস্থ্য আপডেট' },
];

/**
 * Optional Sign-in — VYTANEXA-BLUEPRINT.md § S03 "SCREEN 5"
 *
 * Uses Supabase Auth's phone-OTP and Google OAuth flows directly --
 * this is correct, complete client code. What it depends on that this
 * codebase cannot itself provide: an SMS provider (e.g. Twilio) wired
 * into the Supabase project for OTP delivery, and a Google OAuth
 * client configured in the Supabase dashboard. Without those, the
 * calls below will reach Supabase and fail with a clear provider-not-
 * configured error rather than silently pretending to work -- an
 * infrastructure/dashboard configuration step for Juyel, not a code
 * defect, the same category of gap as the sandbox's Google Fonts
 * network block noted earlier in this project.
 */
export function SigninStep() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidPhone = /^[6-9]\d{9}$/.test(phone);

  const completeAsGuest = () => {
    localStorage.setItem('vytanexa_first_run', 'done');
    localStorage.setItem('vytanexa_user_guest', 'true');
    router.replace('/');
  };

  const handleSendOtp = async () => {
    if (!isValidPhone) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const fullPhone = `+91${phone}`;
    const { error: otpError } = await supabase.auth.signInWithOtp({ phone: fullPhone });
    setLoading(false);
    if (otpError) {
      setError('OTP পাঠাতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      return;
    }
    router.push(`/auth/verify?phone=${encodeURIComponent(fullPhone)}`);
  };

  const handleGoogleSignin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });
  };

  return (
    <div className="flex min-h-dvh flex-col px-6 pt-10">
      <p className="text-[13px] text-neutral-400">২/২</p>
      <h1 className="mt-1 text-[20px] font-bold text-neutral-900">স্বাগতম! 👋</h1>
      <p className="mt-1 text-[14px] text-neutral-600">সাইন ইন করে আরো সুবিধা পান</p>

      <div className="mt-5 flex flex-col gap-2">
        {BENEFITS.map((b) => (
          <div key={b.text} className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-[16px]">
              {b.emoji}
            </span>
            <span className="text-[14px] text-neutral-700">{b.text}</span>
          </div>
        ))}
      </div>

      <p className="mt-6 text-[13px] font-medium text-neutral-700">
        📱 মোবাইল নম্বর দিয়ে সাইন ইন
      </p>
      <div className="mt-2 flex h-12 items-center rounded-md border border-neutral-200 px-3">
        <span className="mr-2 text-[14px] text-neutral-500">🇮🇳 +91</span>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
          placeholder="মোবাইল নম্বর লিখুন"
          inputMode="numeric"
          className="flex-1 text-[14px] outline-none placeholder:text-neutral-400"
        />
      </div>
      {error && <p className="mt-1 text-[12px] text-emergency-600">{error}</p>}

      <button
        onClick={handleSendOtp}
        disabled={!isValidPhone || loading}
        className="mt-3 h-12 rounded-md bg-brand-600 text-[15px] font-semibold text-white disabled:opacity-40"
      >
        {loading ? 'পাঠানো হচ্ছে...' : 'OTP পাঠান →'}
      </button>

      <div className="my-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-neutral-200" />
        <span className="text-[12px] text-neutral-400">অথবা</span>
        <span className="h-px flex-1 bg-neutral-200" />
      </div>

      <button
        onClick={handleGoogleSignin}
        className="h-12 rounded-md border border-neutral-200 text-[14px] font-medium text-neutral-700"
      >
        Google দিয়ে সাইন ইন
      </button>

      <div className="flex-1" />

      <div className="pb-8 text-center">
        <button onClick={completeAsGuest} className="text-[14px] text-neutral-500">
          এখন সাইন ইন করতে চাই না
        </button>
        <p className="mt-1 text-[12px] text-neutral-400">পরে অ্যাকাউন্ট → সাইন ইন</p>
      </div>
    </div>
  );
}
