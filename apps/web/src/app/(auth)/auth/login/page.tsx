'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}

/**
 * Standalone Login — VYTANEXA-BLUEPRINT.md § S02 route map
 * `/auth/login`. Distinct from onboarding's SigninStep: this is the
 * entry point for a returning guest who skipped sign-in earlier and
 * later taps "সাইন ইন" from S16 (More page) or a soft-gate prompt
 * (S17 favorites, S07 reviews). Same underlying Supabase Auth calls,
 * without the onboarding benefits framing since the user already
 * knows the app.
 */
function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') ?? '/';

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidPhone = /^[6-9]\d{9}$/.test(phone);

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
    router.push(
      `/auth/verify?phone=${encodeURIComponent(fullPhone)}&returnUrl=${encodeURIComponent(returnUrl)}`
    );
  };

  const handleGoogleSignin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${returnUrl}` },
    });
  };

  return (
    <div className="flex min-h-dvh flex-col px-6 pt-6">
      <button onClick={() => router.back()} aria-label="পেছনে যান">
        <ChevronLeft className="h-6 w-6 text-neutral-700" />
      </button>

      <h1 className="mt-6 text-[20px] font-bold text-neutral-900">সাইন ইন করুন</h1>

      <p className="mt-6 text-[13px] font-medium text-neutral-700">📱 মোবাইল নম্বর</p>
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
    </div>
  );
}
