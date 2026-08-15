'use client';

import { useState } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';

const REASONS: [string, string][] = [
  ['wrong_phone', 'ফোন নম্বর ভুল'],
  ['wrong_address', 'ঠিকানা ভুল'],
  ['wrong_hours', 'সময়সূচি ভুল'],
  ['closed', 'বন্ধ হয়ে গেছে'],
  ['other', 'অন্যান্য'],
];

/**
 * Data Report Sheet — VYTANEXA-BLUEPRINT.md § S15 "Reports (User-
 * Flagged Data Corrections)": "Not a standalone page — a cross-cutting
 * action available on Doctor Profile, Hospital Detail (⋯ menu →
 * 'তথ্য ভুল আছে?')." One shared component so both entry points stay
 * in sync rather than two near-duplicate sheets.
 */
export function DataReportSheet({
  open,
  onClose,
  entityType,
  entityId,
}: {
  open: boolean;
  onClose: () => void;
  entityType: 'doctor' | 'hospital';
  entityId: string;
}) {
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch('/api/data-reports', {
      method: 'POST',
      body: JSON.stringify({ entity_type: entityType, entity_id: entityId, reason, detail }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? 'রিপোর্ট জমা দিতে সমস্যা হয়েছে');
      return;
    }
    fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify({
        event_type: 'data_report_submit',
        entity_type: entityType,
        entity_id: entityId,
        metadata: { reason },
      }),
    }).catch(() => {});
    setSuccess(true);
    setTimeout(() => {
      onClose();
      setSuccess(false);
      setReason('');
      setDetail('');
    }, 1500);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="ভুল তথ্য জানান">
      {success ? (
        <p className="py-8 text-center text-[15px] font-semibold text-life-600">
          ✅ ধন্যবাদ! আমরা যাচাই করে দেখব
        </p>
      ) : (
        <>
          <p className="mb-2 text-[13px] font-medium text-neutral-700">কোন তথ্যে সমস্যা? *</p>
          <div className="mb-3 space-y-1.5">
            {REASONS.map(([value, label]) => (
              <label
                key={value}
                className="flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-2.5 text-[13px] text-neutral-700"
              >
                <input
                  type="radio"
                  name="report-reason"
                  checked={reason === value}
                  onChange={() => setReason(value)}
                />
                {label}
              </label>
            ))}
          </div>

          <label className="mb-1 block text-[13px] font-medium text-neutral-700">
            বিস্তারিত (ঐচ্ছিক)
          </label>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={3}
            className="mb-3 w-full rounded-md border border-neutral-200 px-3 py-2 text-[14px]"
          />

          {error && <p className="mb-2 text-[12px] text-emergency-600">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={!reason || submitting}
            className="h-12 w-full rounded-md bg-brand-600 text-[15px] font-semibold text-white disabled:opacity-40"
          >
            {submitting ? 'জমা হচ্ছে...' : 'জমা দিন'}
          </button>
        </>
      )}
    </BottomSheet>
  );
}
