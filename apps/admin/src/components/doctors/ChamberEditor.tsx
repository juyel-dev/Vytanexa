'use client';

import { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { sortLocationsHierarchically } from '@/lib/location-hierarchy';

type ScheduleEntry = { day: 'sat' | 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri'; open: string; close: string };

const DAYS: { key: ScheduleEntry['day']; bn: string }[] = [
  { key: 'sat', bn: 'শনি' },
  { key: 'sun', bn: 'রবি' },
  { key: 'mon', bn: 'সোম' },
  { key: 'tue', bn: 'মঙ্গল' },
  { key: 'wed', bn: 'বুধ' },
  { key: 'thu', bn: 'বৃহঃ' },
  { key: 'fri', bn: 'শুক্র' },
];

const DAY_SET = new Set(DAYS.map((d) => d.key));

export type ChamberFormValue = {
  id?: string;
  chamber_name: string;
  location_id: string;
  address_line: string;
  phone: string;
  whatsapp_number: string;
  map_link: string;
  latitude: string;
  longitude: string;
  consultation_fee: string;
  schedule: ScheduleEntry[];
  is_primary: boolean;
  is_active: boolean;
};

type Props = {
  chambers: ChamberFormValue[];
  onChange: (next: ChamberFormValue[]) => void;
  locations: import('@/lib/location-hierarchy').LocationNode[];
};

export function ChamberEditor({ chambers, onChange, locations }: Props) {
  const sortedLocations = sortLocationsHierarchically(locations);
  const update = (idx: number, patch: Partial<ChamberFormValue>) => {
    const next = [...chambers];
    next[idx] = { ...next[idx]!, ...patch };
    onChange(next);
  };

  const addChamber = () => {
    onChange([
      ...chambers,
      {
        chamber_name: '',
        location_id: '',
        address_line: '',
        phone: '',
        whatsapp_number: '',
        map_link: '',
        latitude: '',
        longitude: '',
        consultation_fee: '',
        schedule: [{ day: 'sat', open: '15:00', close: '21:00' }],
        is_primary: chambers.length === 0,
        is_active: true,
      },
    ]);
  };

  const remove = (idx: number) => onChange(chambers.filter((_, i) => i !== idx));

  const setPrimary = (idx: number) => {
    onChange(chambers.map((c, i) => ({ ...c, is_primary: i === idx })));
  };

  const locName = (id: string) => {
    const l = locations.find((x) => x.id === id);
    if (!l) return '—';
    const t = l.name_translations as { bn?: string; en?: string } | null;
    return (t?.bn || t?.en || l.slug) as string;
  };

  if (chambers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-admin-border bg-neutral-50 px-4 py-6 text-center">
        <p className="text-admin-body text-neutral-500">এখনো কোনো চেম্বার যোগ করা হয়নি।</p>
        <button type="button" onClick={addChamber} className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-admin-body font-medium text-white hover:bg-brand-700">
          <Plus className="h-4 w-4" /> নতুন চেম্বার যোগ করুন
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {chambers.map((ch, idx) => (
        <div key={idx} className="rounded-lg border border-admin-border bg-white p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-admin-h3 text-neutral-900">
              চেম্বার {idx + 1}: {ch.chamber_name || 'নামহীন'} {ch.is_primary && <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-700">প্রধান ●</span>}
            </h4>
            <span className="flex items-center gap-1">
              <button type="button" onClick={() => setPrimary(idx)} className={`rounded-md border px-2 py-1 text-admin-small ${ch.is_primary ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-admin-border bg-white text-neutral-600 hover:bg-neutral-50'}`}>
                প্রধান
              </button>
              <button type="button" onClick={() => remove(idx)} className="flex h-7 w-7 items-center justify-center rounded-md border border-admin-border bg-white text-emergency-600 hover:bg-emergency-50" aria-label="মুছুন">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </span>
          </div>

          <div className="mt-3 grid gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-admin-small font-medium text-neutral-700">চেম্বার নাম *</span>
              <input value={ch.chamber_name} onChange={(e) => update(idx, { chamber_name: e.target.value })} placeholder="প্রান্ত ডায়াগনস্টিক সেন্টার" className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-admin-small font-medium text-neutral-700">এলাকা *</span>
                <select value={ch.location_id} onChange={(e) => update(idx, { location_id: e.target.value })} className="h-9 rounded-md border border-admin-border bg-white px-2 text-admin-body">
                  <option value="">এলাকা নির্বাচন করুন</option>
                  {sortedLocations.map((l) => (
                    <option key={l.id} value={l.id} disabled={!l.selectable} className={l.selectable ? '' : 'font-semibold text-neutral-400'}>
                      {'\u00A0\u00A0'.repeat(l.depth)}
                      {l.selectable ? '' : '— '}
                      {l.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-admin-small font-medium text-neutral-700">ফোন *</span>
                <input value={ch.phone} onChange={(e) => update(idx, { phone: e.target.value })} placeholder="98xxxxxxxx" className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-admin-small font-medium text-neutral-700">ঠিকানা *</span>
              <input value={ch.address_line} onChange={(e) => update(idx, { address_line: e.target.value })} placeholder="রাস্তা, এলাকা" className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1">
                <span className="text-admin-small font-medium text-neutral-700">WhatsApp</span>
                <input value={ch.whatsapp_number} onChange={(e) => update(idx, { whatsapp_number: e.target.value })} placeholder="98xxxxxxxx" className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-admin-small font-medium text-neutral-700">Google Maps লিংক</span>
                <input value={ch.map_link} onChange={(e) => update(idx, { map_link: e.target.value })} placeholder="https://maps.google.com/..." className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-admin-small font-medium text-neutral-700">ভিজিট ফি</span>
                <input value={ch.consultation_fee} onChange={(e) => update(idx, { consultation_fee: e.target.value })} inputMode="decimal" placeholder="500" className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-admin-small font-medium text-neutral-700">অক্ষাংশ</span>
                <input value={ch.latitude} onChange={(e) => update(idx, { latitude: e.target.value })} inputMode="decimal" placeholder="22.57" className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-admin-small font-medium text-neutral-700">দ্রাঘিমাংশ</span>
                <input value={ch.longitude} onChange={(e) => update(idx, { longitude: e.target.value })} inputMode="decimal" placeholder="88.36" className="h-9 rounded-md border border-admin-border px-3 text-admin-body outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
              </label>
            </div>

            {/* schedule */}
            <div className="rounded-md border border-admin-border bg-neutral-50 p-3">
              <p className="text-admin-small font-medium text-neutral-700">সময়সূচি</p>
              <div className="mt-2 flex flex-col gap-2">
                {ch.schedule.map((row, rIdx) => (
                  <div key={rIdx} className="flex flex-wrap items-center gap-2 rounded-md border border-admin-border bg-white px-2 py-2">
                    <span className="flex flex-wrap gap-1">
                      {DAYS.map((d) => {
                        const active = row.day === d.key;
                        return (
                          <button
                            key={d.key}
                            type="button"
                            onClick={() => {
                              const next = [...ch.schedule];
                              next[rIdx] = { ...row, day: d.key };
                              update(idx, { schedule: next });
                            }}
                            className={`rounded px-1.5 py-0.5 text-[12px] ${active ? 'bg-brand-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
                          >
                            {d.bn}
                          </button>
                        );
                      })}
                    </span>
                    <input type="time" value={row.open} onChange={(e) => { const next = [...ch.schedule]; next[rIdx] = { ...row, open: e.target.value }; update(idx, { schedule: next }); }} className="h-7 rounded border border-admin-border px-1 text-[12px]" />
                    <span className="text-admin-small text-neutral-400">—</span>
                    <input type="time" value={row.close} onChange={(e) => { const next = [...ch.schedule]; next[rIdx] = { ...row, close: e.target.value }; update(idx, { schedule: next }); }} className="h-7 rounded border border-admin-border px-1 text-[12px]" />
                    <button type="button" onClick={() => { const next = ch.schedule.filter((_, i) => i !== rIdx); update(idx, { schedule: next }); }} className="ml-auto text-admin-small text-emergency-600 hover:text-emergency-700">✕</button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => update(idx, { schedule: [...ch.schedule, { day: 'sat', open: '15:00', close: '21:00' }] })}
                  className="self-start rounded-md border border-admin-border bg-white px-3 py-1 text-admin-small text-neutral-600 hover:bg-neutral-50"
                >
                  + ভিন্ন সময়ের জন্য আরেকটি সময়সূচি যোগ করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      <button type="button" onClick={addChamber} className="self-start rounded-md border border-admin-border bg-white px-4 py-2 text-admin-body font-medium text-neutral-700 hover:bg-neutral-50">
        + নতুন চেম্বার যোগ করুন
      </button>
    </div>
  );
}
