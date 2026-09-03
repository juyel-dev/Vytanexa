'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * First-Run Gate — VYTANEXA-BLUEPRINT.md § S03 "OVERVIEW — First-Run
 * Flow": checks `vytanexa_first_run` on app entry, sends first-time
 * visitors to /onboarding before they see anything else. Placed in
 * the (main) layout so it protects every entry point (a shared
 * /doctors/[slug] link, not just the home page).
 *
 * Renders nothing — this is a pure side-effect component, kept
 * separate from BottomNav/EmergencyFAB so it doesn't force those to
 * be Client Components too.
 */
export function FirstRunGate() {
  const router = useRouter();

  useEffect(() => {
    const firstRun = localStorage.getItem('vytanexa_first_run');
    if (!firstRun) {
      router.replace('/onboarding');
      return;
    }
    // Migrate legacy localStorage-only completions to the cookie the
    // middleware reads (server can't see localStorage). Without this,
    // users who finished onboarding before the cookie existed would be
    // bounced back to /onboarding by the middleware on every visit.
    if (!document.cookie.includes('vytanexa_first_run=done')) {
      document.cookie = 'vytanexa_first_run=done; path=/; max-age=31536000';
    }
  }, [router]);

  return null;
}
