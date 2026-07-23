'use client';

import { Phone, MessageCircle, MapPin as MapPinIcon } from 'lucide-react';
import type { DoctorDetail } from '@/lib/queries/doctor-detail';
import {
  groupSchedule,
  getClosedDaysLabel,
  getChamberStatus,
  type ScheduleEntry,
} from '@/lib/chamber-schedule';

type Chamber = DoctorDetail['chambers'][number];

/**
 * Tab 2 — চেম্বার (Chambers) — VYTANEXA-BLUEPRINT.md § S07 Tab 2.
 * Uses the schedule grouping + live-status algorithm from
 * lib/chamber-schedule.ts.
 */
export function ChambersTab({ chambers }: { chambers: Chamber[] }) {
  if (chambers.length === 0) {
    return (
      <div className="px-6 py-10 text-center">
        <p className="text-[14px] text-neutral-500">
          এখনো কোনো চেম্বারের তথ্য যোগ হয়নি। সরাসরি যোগাযোগ করুন।
        </p>
      </div>
    );
  }

  const sorted = [...chambers].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    return a.display_order - b.display_order;
  });

  return (
    <div className="px-4 py-3">
      {sorted.map((chamber) => {
        const schedule = (chamber.schedule as unknown as ScheduleEntry[]) ?? [];
        const grouped = groupSchedule(schedule);
        const closedLabel = getClosedDaysLabel(schedule);
        const status = getChamberStatus(schedule);

        return (
          <div
            key={chamber.id}
            className="mb-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-neutral-900">
                🏥 {chamber.chamber_name}
              </h3>
              {chamber.is_primary && (
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] text-brand-600">
                  প্রধান
                </span>
              )}
            </div>

            <p className="mt-1.5 flex items-start gap-1.5 text-[13px] text-neutral-600">
              <MapPinIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
              {chamber.address_line}
            </p>

            {grouped.length > 0 && (
              <div className="mt-3">
                <p className="text-[13px] font-semibold text-neutral-800">⏰ সময়সূচি:</p>
                {grouped.map((g) => (
                  <p key={g.days.join()} className="mt-0.5 text-[13px] text-neutral-700">
                    {g.daysLabel}: {g.open} – {g.close}
                  </p>
                ))}
                {closedLabel && <p className="mt-0.5 text-[12px] text-neutral-400">{closedLabel}</p>}

                <span
                  className={`mt-2 inline-block rounded-full px-2.5 py-1 text-[12px] font-medium ${
                    status.status === 'open_now'
                      ? 'bg-life-50 text-life-700'
                      : status.status === 'opens_later'
                        ? 'bg-accent-50 text-accent-600'
                        : 'bg-neutral-100 text-neutral-500'
                  }`}
                >
                  {status.status === 'open_now' && `🟢 আজ খোলা — ${status.closesAt} পর্যন্ত`}
                  {status.status === 'opens_later' && `🟡 আজ খোলা — ${status.opensAt}-এ শুরু`}
                  {status.status === 'closed' &&
                    (status.nextOpenDay
                      ? `🔴 আজ বন্ধ — ${status.nextOpenDay} খোলা থাকবে`
                      : '🔴 আজ বন্ধ')}
                </span>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between text-[13px]">
              {chamber.consultation_fee != null && (
                <span className="font-semibold text-neutral-900">
                  💰 ভিজিট ফি: ₹{chamber.consultation_fee}
                </span>
              )}
              <span className="text-neutral-600">📞 {chamber.phone}</span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <a
                href={`tel:${chamber.phone}`}
                className="flex h-9 items-center justify-center gap-1 rounded-md bg-brand-600 text-[12px] font-semibold text-white"
              >
                <Phone className="h-3.5 w-3.5" /> কল
              </a>
              {chamber.whatsapp_number ? (
                <a
                  href={`https://wa.me/${chamber.whatsapp_number}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 items-center justify-center gap-1 rounded-md bg-life-600 text-[12px] font-semibold text-white"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </a>
              ) : (
                <span />
              )}
              {chamber.map_link ? (
                <a
                  href={chamber.map_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 items-center justify-center rounded-md border border-neutral-200 text-[12px] font-semibold text-neutral-700"
                >
                  দিকনির্দেশনা
                </a>
              ) : (
                <span />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
