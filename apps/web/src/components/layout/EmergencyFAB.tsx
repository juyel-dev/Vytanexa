'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Siren, X, Ambulance, Building2, Droplet, Phone } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { getLocalizedField } from '@/lib/i18n';
import type { Json } from '@vytanexa/database';

type SheetKind = 'ambulance' | 'hospital' | 'blood' | null;

/**
 * Emergency FAB — VYTANEXA-BLUEPRINT.md § S02 § 2.3 + § S12
 * Global, renders on every (main)-group page. Expands to 3 options,
 * each opening a condensed bottom sheet (fastest path to a phone
 * number, per S12's explicit design goal).
 *
 * National emergency numbers are hardcoded (never DB-dependent) per
 * S12's own instruction: "these render even with zero network
 * connectivity... this is the one page in the app that must work
 * offline." Actual offline caching (service worker precache) is S22
 * PWA scope, not yet built — but the numbers themselves being
 * hardcoded here rather than fetched is the correctness precondition
 * for that to work later without a code change.
 */
const NATIONAL_AMBULANCE = { label: 'জাতীয় অ্যাম্বুলেন্স সেবা', number: '102' };

export function EmergencyFAB() {
  const [expanded, setExpanded] = useState(false);
  const [activeSheet, setActiveSheet] = useState<SheetKind>(null);
  const [hospitals, setHospitals] = useState<
    { id: string; slug: string; name_translations: Json; phone: string }[]
  >([]);
  const [ambulances, setAmbulances] = useState<
    { id: string; name_translations: Json; phone: string }[]
  >([]);
  const [loading, setLoading] = useState(false);

  const openSheet = async (kind: SheetKind) => {
    setExpanded(false);
    setActiveSheet(kind);
    if (kind === 'hospital' && hospitals.length === 0) {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from('hospitals')
        .select('id, slug, name_translations, phone')
        .eq('verification_status', 'verified')
        .eq('has_emergency_dept', true)
        .limit(5);
      setHospitals(data ?? []);
      setLoading(false);
    }
    if (kind === 'ambulance' && ambulances.length === 0) {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from('ambulance_services')
        .select('id, name_translations, phone')
        .eq('verification_status', 'verified')
        .eq('is_active', true)
        .limit(5);
      setAmbulances(data ?? []);
      setLoading(false);
    }
  };

  return (
    <>
      {expanded && (
        <div
          className="fixed inset-0 z-fab bg-neutral-900/20"
          onClick={() => setExpanded(false)}
          aria-hidden="true"
        />
      )}

      <div className="fixed bottom-[calc(theme(spacing.navbar)+16px+env(safe-area-inset-bottom))] right-4 z-fab flex flex-col items-end gap-2">
        {expanded && (
          <>
            <FabOption
              icon={<Ambulance className="h-5 w-5" />}
              label="অ্যাম্বুলেন্স"
              onClick={() => openSheet('ambulance')}
            />
            <FabOption
              icon={<Droplet className="h-5 w-5" />}
              label="ব্লাড সার্ভিস"
              onClick={() => openSheet('blood')}
            />
            <FabOption
              icon={<Building2 className="h-5 w-5" />}
              label="নিকট হাসপাতাল"
              onClick={() => openSheet('hospital')}
            />
          </>
        )}

        <button
          onClick={() => setExpanded((v) => !v)}
          aria-label="জরুরি সেবা"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-emergency-600 text-white shadow-xl transition-transform active:scale-90"
        >
          {expanded ? <X className="h-6 w-6" /> : <Siren className="h-6 w-6" />}
        </button>
      </div>

      <BottomSheet
        open={activeSheet === 'ambulance'}
        onClose={() => setActiveSheet(null)}
        title="অ্যাম্বুলেন্স"
      >
        <a
          href={`tel:${NATIONAL_AMBULANCE.number}`}
          className="mb-2 flex items-center justify-between rounded-lg bg-emergency-50 p-3"
        >
          <span className="text-[14px] font-semibold text-emergency-700">
            📞 {NATIONAL_AMBULANCE.number} — {NATIONAL_AMBULANCE.label}
          </span>
          <Phone className="h-5 w-5 text-emergency-600" />
        </a>
        {loading && <p className="py-3 text-center text-[13px] text-neutral-400">লোড হচ্ছে...</p>}
        {ambulances.map((a) => (
          <a
            key={a.id}
            href={`tel:${a.phone}`}
            className="mb-2 flex items-center justify-between rounded-lg border border-neutral-100 p-3"
          >
            <span className="text-[14px] text-neutral-800">
              📞 {getLocalizedField(a.name_translations)}
            </span>
            <Phone className="h-4 w-4 text-neutral-500" />
          </a>
        ))}
        <Link href="/emergency" className="block py-2 text-center text-[13px] text-brand-600">
          সব জরুরি নম্বর দেখুন →
        </Link>
      </BottomSheet>

      <BottomSheet
        open={activeSheet === 'hospital'}
        onClose={() => setActiveSheet(null)}
        title="নিকট হাসপাতাল"
      >
        {loading && <p className="py-3 text-center text-[13px] text-neutral-400">লোড হচ্ছে...</p>}
        {!loading && hospitals.length === 0 && (
          <p className="py-3 text-center text-[13px] text-neutral-400">
            এই মুহূর্তে জরুরি বিভাগসহ হাসপাতাল যোগ করা হয়নি
          </p>
        )}
        {hospitals.map((h) => (
          <div key={h.id} className="mb-2 flex items-center justify-between rounded-lg border border-neutral-100 p-3">
            <span className="text-[14px] text-neutral-800">
              {getLocalizedField(h.name_translations)}
            </span>
            <a href={`tel:${h.phone}`}>
              <Phone className="h-4 w-4 text-emergency-600" />
            </a>
          </div>
        ))}
        <Link href="/emergency" className="block py-2 text-center text-[13px] text-brand-600">
          সব জরুরি সেবা দেখুন →
        </Link>
      </BottomSheet>

      <BottomSheet
        open={activeSheet === 'blood'}
        onClose={() => setActiveSheet(null)}
        title="ব্লাড সার্ভিস"
      >
        <Link
          href="/health/blood-services"
          className="block rounded-md bg-emergency-600 py-3 text-center text-[14px] font-semibold text-white"
        >
          ব্লাড ব্যাংক ও রক্তদাতা দেখুন →
        </Link>
      </BottomSheet>
    </>
  );
}

function FabOption({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-full bg-white py-2 pl-3 pr-4 shadow-md animate-slide-up"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emergency-50 text-emergency-600">
        {icon}
      </span>
      <span className="text-[13px] font-medium text-neutral-800">{label}</span>
    </button>
  );
}
