'use client';

import { useEffect, useState } from 'react';

export type AuthMethods = { phone: boolean; google: boolean };

/**
 * Enabled sign-in methods, or `null` while loading. A failed lookup is
 * treated as "none enabled": hiding a sign-in button is safer than
 * showing one that errors. Guest mode is always available.
 */
export function useAuthMethods(): AuthMethods | null {
  const [methods, setMethods] = useState<AuthMethods | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth-methods')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('status'))))
      .then((j) => !cancelled && setMethods({ phone: !!j.phone, google: !!j.google }))
      .catch(() => !cancelled && setMethods({ phone: false, google: false }));
    return () => {
      cancelled = true;
    };
  }, []);
  return methods;
}
