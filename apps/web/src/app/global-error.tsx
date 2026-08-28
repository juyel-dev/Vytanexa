'use client';

/**
 * Global Error — catches errors thrown in the root layout itself
 * (e.g. locale provider, font loading). Next.js requires this to
 * render its own <html><body> shell since the root layout is the
 * boundary that otherwise has no parent to recover.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="bn">
      <body className="flex min-h-dvh flex-col items-center justify-center px-6 py-12 text-center">
        <h1 className="text-[17px] font-bold text-neutral-900">কিছু ভুল হয়েছে</h1>
        <p className="mt-1 text-[14px] text-neutral-500">অ্যাপ লোড করতে সমস্যা হয়েছে।</p>
        <button
          onClick={() => reset()}
          className="mt-6 h-11 rounded-md bg-brand-600 px-6 text-[14px] font-semibold text-white"
        >
          আবার চেষ্টা করুন
        </button>
      </body>
    </html>
  );
}
