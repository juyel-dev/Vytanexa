'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const RESEND_SECONDS = 30;

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyPageContent />
    </Suspense>
  );
}

/**
 * OTP Verification — VYTANEXA-BLUEPRINT.md § S03 "OTP VERIFICATION
 * SCREEN". 6 auto-advancing digit boxes, auto-verify on the 6th
 * digit (no submit button, per spec), 30s resend countdown.
 */
function VerifyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') ?? '';
  const returnUrl = searchParams.get('returnUrl') ?? '/';

  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  const verifyCode = async (code: string) => {
    setVerifying(true);
    setError(null);
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone,
      token: code,
      type: 'sms',
    });
    setVerifying(false);

    if (verifyError) {
      setError('কোড সঠিক নয়। আবার চেষ্টা করুন।');
      setDigits(Array(6).fill(''));
      inputRefs.current[0]?.focus();
      return;
    }

    localStorage.setItem('vytanexa_first_run', 'done');
    localStorage.removeItem('vytanexa_user_guest');
    router.replace(returnUrl);
  };

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    if (next.every((d) => d) && next.join('').length === 6) {
      verifyCode(next.join(''));
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      verifyCode(pasted);
    }
  };

  const handleResend = async () => {
    if (resendIn > 0) return;
    const supabase = createClient();
    await supabase.auth.signInWithOtp({ phone });
    setResendIn(RESEND_SECONDS);
  };

  return (
    <div className="flex min-h-dvh flex-col px-6 pt-6">
      <button onClick={() => router.back()} aria-label="পেছনে যান">
        <ChevronLeft className="h-6 w-6 text-neutral-700" />
      </button>

      <h1 className="mt-6 text-[20px] font-bold text-neutral-900">OTP যাচাই করুন</h1>
      <p className="mt-2 text-[14px] text-neutral-600">
        {phone} নম্বরে ৬ সংখ্যার কোড পাঠানো হয়েছে
      </p>

      <div className="mt-6 flex justify-center gap-2" onPaste={handlePaste}>
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !digit && i > 0) {
                inputRefs.current[i - 1]?.focus();
              }
            }}
            inputMode="numeric"
            maxLength={1}
            disabled={verifying}
            className="h-[60px] w-[52px] rounded-md border border-neutral-200 text-center text-[24px] font-bold text-neutral-900 focus:border-brand-600 focus:outline-none"
          />
        ))}
      </div>

      {error && <p className="mt-3 text-center text-[13px] text-emergency-600">{error}</p>}
      {verifying && (
        <p className="mt-3 text-center text-[13px] text-neutral-400">যাচাই করা হচ্ছে...</p>
      )}

      <div className="mt-6 text-center">
        {resendIn > 0 ? (
          <p className="text-[13px] text-neutral-400">
            কোড আসেনি? পুনরায় পাঠান ({resendIn}s)
          </p>
        ) : (
          <button onClick={handleResend} className="text-[13px] text-brand-600">
            পুনরায় পাঠান
          </button>
        )}
      </div>

      <button
        onClick={() => router.back()}
        className="mt-2 text-center text-[13px] text-neutral-400"
      >
        ভুল নম্বর? নম্বর পরিবর্তন করুন
      </button>
    </div>
  );
}
