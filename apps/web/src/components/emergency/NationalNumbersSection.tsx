'use client';

import { Phone } from 'lucide-react';

/**
 * National Emergency Numbers — VYTANEXA-BLUEPRINT.md § S12 "National
 * Numbers (Hardcoded, Not DB-Dependent)": "These render even with zero
 * network connectivity ... this is the one page in the app that must
 * work offline."
 *
 * Deliberately its own lightweight component (no Supabase client, no
 * Zustand store — just `fetch()` for analytics, same fire-and-forget
 * pattern as everywhere else) so this section never depends on the
 * heavier `EmergencyDataSections` bundle. See `emergency/page.tsx`
 * for why that split matters for bundle size, not just semantics.
 */
const NATIONAL_NUMBERS = [
  { label: 'অ্যাম্বুলেন্স', number: '102', type: 'ambulance' },
  { label: 'পুলিশ', number: '100', type: 'police' },
  { label: 'ফায়ার সার্ভিস', number: '101', type: 'fire' },
  { label: 'নারী হেল্পলাইন', number: '1091', type: 'women_helpline' },
  { label: 'শিশু হেল্পলাইন', number: '1098', type: 'child_helpline' },
  { label: 'মানসিক স্বাস্থ্য (Kiran)', number: '14416', type: 'mental_health' },
  { label: 'সাইবার ক্রাইম', number: '1930', type: 'cyber_crime' },
] as const;

export function NationalNumbersSection() {
  return (
    <section className="bg-emergency-50 px-4 py-4">
      <h2 className="mb-3 text-[15px] font-bold text-emergency-700">🚨 জাতীয় জরুরি নম্বর</h2>
      <div className="grid grid-cols-2 gap-2">
        {NATIONAL_NUMBERS.map((n) => (
          <a
            key={n.number}
            href={`tel:${n.number}`}
            onClick={() =>
              fetch('/api/analytics', {
                method: 'POST',
                body: JSON.stringify({
                  event_type: 'emergency_call_click',
                  metadata: { number_type: 'national', label: `${n.number}_${n.type}` },
                }),
              }).catch(() => {})
            }
            className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm"
          >
            <span className="text-[13px] font-semibold text-neutral-800">
              📞 {n.number} {n.label}
            </span>
            <Phone className="h-4 w-4 text-emergency-600" />
          </a>
        ))}
      </div>
    </section>
  );
}
