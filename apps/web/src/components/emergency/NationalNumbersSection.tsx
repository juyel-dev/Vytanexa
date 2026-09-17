'use client';

import { Phone } from 'lucide-react';
import { useT } from '@vytanexa/i18n/client';

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
 *
 * `labelKey` (not a hardcoded label) so both this component and
 * `EmergencyFAB.tsx` (which also renders this list) can resolve the
 * display label through `emergency.nationalNumbers.*` in the caller's
 * own locale.
 */
export const NATIONAL_NUMBERS = [
  { labelKey: 'ambulance', number: '102', type: 'ambulance' },
  { labelKey: 'police', number: '100', type: 'police' },
  { labelKey: 'fire', number: '101', type: 'fire' },
  { labelKey: 'womenHelpline', number: '1091', type: 'women_helpline' },
  { labelKey: 'childHelpline', number: '1098', type: 'child_helpline' },
  { labelKey: 'mentalHealth', number: '14416', type: 'mental_health' },
  { labelKey: 'cyberCrime', number: '1930', type: 'cyber_crime' },
] as const;

export function NationalNumbersSection() {
  const t = useT('emergency');
  return (
    <section className="bg-emergency-50 px-4 py-4">
      <h2 className="mb-3 text-[15px] font-bold text-emergency-700">{t('nationalNumbers.heading')}</h2>
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
              📞 {n.number} {t(`nationalNumbers.${n.labelKey}` as Parameters<typeof t>[0])}
            </span>
            <Phone className="h-4 w-4 text-emergency-600" />
          </a>
        ))}
      </div>
    </section>
  );
}
