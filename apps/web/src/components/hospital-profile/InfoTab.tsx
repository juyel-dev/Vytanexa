'use client';

import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { useT } from '@vytanexa/i18n/client';
import { useLocalizedField } from '@/lib/i18n-client';
import { groupSchedule, getClosedDaysLabel, type ScheduleEntry } from '@/lib/chamber-schedule';
import type { HospitalDetail } from '@/lib/queries/hospital-detail';

/**
 * Tab 1 — তথ্য (Info) — VYTANEXA-BLUEPRINT.md § S08 Tab 1: "About text
 * (expandable), facilities grid, visiting hours, insurance/scheme
 * acceptance chips, full address + embedded static map thumbnail (tap
 * → opens directions)."
 *
 * Schema note: there's no `insurance_schemes` column on `hospitals`
 * (DATABASE-SCHEMA.md § 3.2) — that section is omitted rather than
 * fabricated, same honest-gap handling as doctor-profile/InfoTab.tsx's
 * degree note. If scheme acceptance becomes a real product need,
 * that's a schema addition.
 */
export function InfoTab({ hospital }: { hospital: HospitalDetail }) {
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const localize = useLocalizedField();
  const tc = useT('common');
  const t = useT('hospital');
  const dayLabels = tc.raw('day' as Parameters<typeof tc.raw>[0]) as Record<string, string>;
  const closedSuffix = tc('closedSuffix');
  const facilityLabels = t.raw('facility' as Parameters<typeof t.raw>[0]) as Record<string, string>;
  const about = localize(hospital.description_translations);

  const operatingHours = hospital.operating_hours as unknown as
    | { is_24x7: true }
    | { is_24x7: false; schedule: ScheduleEntry[] }
    | null;

  return (
    <div className="divide-y divide-neutral-100 pb-6">
      {about && (
        <section className="px-4 py-4">
          <h3 className="mb-2 text-[15px] font-bold text-neutral-800">{t('info.about')}</h3>
          <p
            className={`text-[14px] leading-relaxed text-neutral-700 ${!aboutExpanded ? 'line-clamp-4' : ''}`}
          >
            {about}
          </p>
          {about.length > 200 && (
            <button
              onClick={() => setAboutExpanded((v) => !v)}
              className="mt-1 text-[13px] text-brand-600"
            >
              {aboutExpanded ? t('info.showLess') : t('info.showMore')}
            </button>
          )}
        </section>
      )}

      {hospital.facility_tags.length > 0 && (
        <section className="px-4 py-4">
          <h3 className="mb-2 text-[15px] font-bold text-neutral-800">{t('info.facilities')}</h3>
          <div className="grid grid-cols-2 gap-2">
            {hospital.facility_tags.map((key) => (
              <span
                key={key}
                className="rounded-md bg-neutral-50 px-3 py-2 text-[13px] text-neutral-700"
              >
                {facilityLabels[key] ?? key}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="px-4 py-4">
        <h3 className="mb-2 text-[15px] font-bold text-neutral-800">{t('info.openingHours')}</h3>
        {operatingHours?.is_24x7 ? (
          <p className="text-[14px] font-semibold text-life-600">{t('info.open24h')}</p>
        ) : operatingHours && 'schedule' in operatingHours && operatingHours.schedule?.length ? (
          <div className="space-y-1">
            {groupSchedule(operatingHours.schedule, dayLabels).map((g, i) => (
              <p key={i} className="text-[13px] text-neutral-700">
                {g.daysLabel}: {g.open} - {g.close}
              </p>
            ))}
            {getClosedDaysLabel(operatingHours.schedule, dayLabels, closedSuffix) && (
              <p className="text-[12px] text-neutral-400">
                {getClosedDaysLabel(operatingHours.schedule, dayLabels, closedSuffix)}
              </p>
            )}
          </div>
        ) : (
          <p className="text-[13px] text-neutral-400">{t('info.noScheduleYet')}</p>
        )}
      </section>

      <section className="px-4 py-4">
        <h3 className="mb-2 text-[15px] font-bold text-neutral-800">{t('info.address')}</h3>
        <p className="mb-2 text-[14px] text-neutral-700">{hospital.address_line}</p>
        {hospital.map_link ? (
          <a
            href={hospital.map_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 items-center justify-center gap-2 rounded-md border border-neutral-200 text-[13px] font-semibold text-brand-600"
          >
            <MapPin className="h-4 w-4" /> {t('info.seeDirections')}
          </a>
        ) : hospital.latitude && hospital.longitude ? (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${hospital.latitude},${hospital.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 items-center justify-center gap-2 rounded-md border border-neutral-200 text-[13px] font-semibold text-brand-600"
          >
            <MapPin className="h-4 w-4" /> {t('info.seeDirections')}
          </a>
        ) : null}
      </section>
    </div>
  );
}
