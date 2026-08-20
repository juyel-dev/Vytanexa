'use client';

import { useState } from 'react';
import type { ReportFormBlock } from '@/lib/custom-page-blocks';

/**
 * `report_form` block — VYTANEXA-BLUEPRINT.md § S19: "A structured
 * submission form — admin defines fields: text/select/checkbox —
 * submissions land in a generic page_submissions table." Fully
 * dynamic rendering from `block.fields` — no field is hardcoded, so
 * an admin can define any combination of text/select/checkbox fields
 * per page without a code change, matching the spec's "no code
 * release needed to publish a new page" promise for the whole S19
 * feature.
 */
export function ReportFormBlockView({
  block,
  pageId,
  blockIndex,
}: {
  block: ReportFormBlock;
  pageId: string;
  blockIndex: number;
}) {
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!block.fields || block.fields.length === 0) return null;

  const canSubmit = block.fields.every((f) => {
    if (!f.required) return true;
    const v = values[f.key];
    return f.field_type === 'checkbox' ? v === true : !!v;
  });

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch('/api/page-submissions', {
      method: 'POST',
      body: JSON.stringify({
        page_id: pageId,
        block_index: blockIndex,
        submission_data: values,
        submitter_phone: phone,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? 'জমা দিতে সমস্যা হয়েছে');
      return;
    }
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="mx-4 my-3 rounded-xl border border-life-200 bg-life-50 p-5 text-center">
        <p className="text-[14px] font-semibold text-life-700">✅ ধন্যবাদ! আপনার তথ্য জমা হয়েছে</p>
      </div>
    );
  }

  return (
    <div className="mx-4 my-3 rounded-xl border border-neutral-200 bg-white p-4">
      {block.heading && (
        <h2 className="mb-3 text-[15px] font-bold text-neutral-900">{block.heading}</h2>
      )}
      {block.fields.map((field) => (
        <div key={field.key} className="mb-3">
          <label className="mb-1 block text-[13px] font-medium text-neutral-700">
            {field.label} {field.required && '*'}
          </label>
          {field.field_type === 'text' && (
            <input
              value={(values[field.key] as string) ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              className="h-11 w-full rounded-md border border-neutral-200 px-3 text-[14px]"
            />
          )}
          {field.field_type === 'select' && (
            <select
              value={(values[field.key] as string) ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              className="h-11 w-full rounded-md border border-neutral-200 px-3 text-[14px]"
            >
              <option value="">নির্বাচন করুন</option>
              {(field.options ?? []).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}
          {field.field_type === 'checkbox' && (
            <label className="flex items-center gap-2 text-[13px] text-neutral-700">
              <input
                type="checkbox"
                checked={(values[field.key] as boolean) ?? false}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.checked }))}
              />
              হ্যাঁ
            </label>
          )}
        </div>
      ))}

      <label className="mb-1 block text-[13px] font-medium text-neutral-700">
        মোবাইল নম্বর (ঐচ্ছিক)
      </label>
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        type="tel"
        className="mb-3 h-11 w-full rounded-md border border-neutral-200 px-3 text-[14px]"
      />

      {error && <p className="mb-2 text-[12px] text-emergency-600">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className="h-11 w-full rounded-md bg-brand-600 text-[14px] font-semibold text-white disabled:opacity-40"
      >
        {submitting ? 'জমা হচ্ছে...' : 'জমা দিন'}
      </button>
    </div>
  );
}
