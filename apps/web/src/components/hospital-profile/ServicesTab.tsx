'use client';

import { useT } from '@vytanexa/i18n/client';
import { useLocalizedField } from '@/lib/i18n-client';
import type { Json } from '@vytanexa/database';

export type MatchedService = {
  canonical_key: string;
  name_translations: Json;
  category: string | null;
};

/**
 * Tab 3 — সেবা (Services & Tests) — VYTANEXA-BLUEPRINT.md § S08 Tab 3:
 * "Grid/list of hospitals.services[] and hospitals.tests[] — grouped
 * by category ... each item shows test name + price (if set) +
 * fallback if no price."
 *
 * Schema note: `hospitals` has one `services TEXT[]` column, not
 * separate `services[]`/`tests[]` columns, and there's no per-hospital
 * price field anywhere in the schema (DATABASE-SCHEMA.md § 3.1-3.2) —
 * so every item falls back to "কল করুন" rather than a fabricated
 * price. `matched` items (resolved against `test_catalog`) are
 * grouped by `test_catalog.category`; `unmatchedKeys` (general
 * service keys with no test_catalog row, e.g. 'icu') get their own
 * "সাধারণ সেবা" group. See `lib/queries/hospital-detail.ts` §
 * `getHospitalServices` for the resolution logic.
 */
export function ServicesTab({
  matched,
  unmatchedKeys,
}: {
  matched: MatchedService[];
  unmatchedKeys: string[];
}) {
  const t = useT('hospital');
  const localize = useLocalizedField();
  const categoryLabels = t.raw('services.category' as Parameters<typeof t.raw>[0]) as Record<string, string>;
  const generalKeyLabels = t.raw('services.generalKey' as Parameters<typeof t.raw>[0]) as Record<string, string>;

  if (matched.length === 0 && unmatchedKeys.length === 0) {
    return (
      <div className="px-6 py-10 text-center">
        <p className="text-[14px] text-neutral-500">{t('services.empty')}</p>
      </div>
    );
  }

  const grouped = new Map<string, MatchedService[]>();
  for (const item of matched) {
    const cat = item.category ?? 'general';
    grouped.set(cat, [...(grouped.get(cat) ?? []), item]);
  }

  return (
    <div className="divide-y divide-neutral-100 pb-6">
      {[...grouped.entries()].map(([category, items]) => (
        <section key={category} className="px-4 py-4">
          <h3 className="mb-2 text-[15px] font-bold text-neutral-800">
            {categoryLabels[category] ?? category}
          </h3>
          <div className="space-y-1">
            {items.map((item) => (
              <div
                key={item.canonical_key}
                className="flex items-center justify-between rounded-md bg-neutral-50 px-3 py-2.5"
              >
                <span className="text-[13px] text-neutral-700">
                  {localize(item.name_translations)}
                </span>
                <span className="text-[11px] text-neutral-400">{t('services.callForInfo')}</span>
              </div>
            ))}
          </div>
        </section>
      ))}

      {unmatchedKeys.length > 0 && (
        <section className="px-4 py-4">
          <h3 className="mb-2 text-[15px] font-bold text-neutral-800">{t('services.generalSectionHeading')}</h3>
          <div className="grid grid-cols-2 gap-2">
            {unmatchedKeys.map((key) => (
              <span
                key={key}
                className="rounded-md bg-neutral-50 px-3 py-2 text-[13px] text-neutral-700"
              >
                {generalKeyLabels[key] ?? key}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
