'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

/**
 * Admin Login — ADMIN-PANEL-SPEC.md § A02 "Authentication Flow".
 *
 * Supabase Auth email/password (a SEPARATE credential set from the
 * user-app's phone-OTP flow). No public signup — accounts are created
 * only by super_admin via the Admin Users screen (A14).
 *
 * Posts to `/api/admin/login` (a Route Handler) rather than calling the
 * browser Supabase client directly — keeps the ~67KB supabase-js bundle
 * OUT of the login page's First Load JS, the same bundle-size lesson
 * documented in CHECKPOINT.md §6 and applied across apps/web.
 */
export default function AdminLogin() {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  // The dashboard lives at `/` (the `(dashboard)` route group adds no
  // path segment), NOT `/dashboard` — defaulting there would land an
  // admin on a 404 right after signing in.
  const next = searchParams.get('next') ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
    }).catch(() => null);

    setLoading(false);

    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => null) : null;
      setError(data?.error ?? t('error'));
      return;
    }
    // The dashboard layout re-checks admin_users for `is_active=true`,
    // so a user who signs in but has no active operator row is sent
    // back here with access_denied rather than landing on the panel.
    router.push(next);
    router.refresh();
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-600 text-xl font-bold text-white">
            V
          </div>
          <h1 className="mt-3 text-admin-h1 text-neutral-900">{t('loginHeading')}</h1>
          <p className="mt-1 text-admin-body text-neutral-500">
            Vytanexa Admin Panel — internal operator tool
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-admin-h3 text-neutral-700">{t('email')}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              inputMode="email"
              className="h-11 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-admin-h3 text-neutral-700">{t('password')}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </label>

          {error && <p className="text-admin-body text-emergency-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="mt-1 h-11 rounded-md bg-brand-600 text-admin-body font-semibold text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            {loading ? 'সাইন ইন হচ্ছে...' : t('submit')}
          </button>
        </form>

        <p className="mt-4 text-center text-admin-small text-neutral-400">
          No public signup — accounts are created by super_admin (A14).
        </p>
      </div>
    </div>
  );
}