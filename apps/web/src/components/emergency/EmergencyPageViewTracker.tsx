'use client';

import { useEffect } from 'react';

/**
 * VYTANEXA-BLUEPRINT.md § S12 "Analytics": `emergency_page_view`.
 * Its own tiny component (just `useEffect` + `fetch`) rather than
 * living inside `EmergencyDataSections` — that component is
 * dynamically deferred, and page-view tracking shouldn't wait on it.
 */
export function EmergencyPageViewTracker() {
  useEffect(() => {
    fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify({ event_type: 'emergency_page_view' }),
    }).catch(() => {});
  }, []);

  return null;
}
