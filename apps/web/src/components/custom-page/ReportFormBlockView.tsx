'use client';

import { useId, useState } from 'react';
import { useT } from '@vytanexa/i18n/client';
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
  const uid = useId();
  const t = useT('customPage');
  const tCommon = useT('common');

  if (!Array.isArray(block.fields) || block.fields.length === 0) return null;

  const canSubmit = block.fields.every((f) => {
    if (!f.required) return true;
    const v = values[f.key];
    return f.field_type === 'checkbox' ? v === true : !!v;
  });

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/page-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page_id: pageId,
          block_index: blockIndex,
          submission_data: values,
          // Phone is optional: an empty string would fail the server's
          // phone regex, so send null instead.
          submitter_phone: phone.trim() || null,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error ?? t('submitErrorFallback'));
        return;
      }
      setSuccess(true);
    } catch {
      // Offline / network failure — previously left the button stuck on "submitting".
      setError(t('submitErrorFallback'));
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="mx-4 my-3 rounded-xl border border-life-200 bg-life-50 p-5 text-center">
        <p className="text-[14px] font-semibold text-life-700">{t('successMessage')}</p>
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
          <label htmlFor={`${uid}-${field.key}`} className="mb-1 block text-[13px] font-medium text-neutral-700">
            {field.label} {field.required && '*'}
          </label>
          {field.field_type === 'text' && (
            <input
              id={`${uid}-${field.key}`}
              maxLength={500}
              value={(values[field.key] as string) ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              className="h-11 w-full rounded-md border border-neutral-200 px-3 text-[14px]"
            />
          )}
          {field.field_type === 'select' && (
            <select
              id={`${uid}-${field.key}`}
              value={(values[field.key] as string) ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              className="h-11 w-full rounded-md border border-neutral-200 px-3 text-[14px]"
            >
              <option value="">{tCommon('select')}</option>
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
                id={`${uid}-${field.key}`}
                type="checkbox"
                checked={(values[field.key] as boolean) ?? false}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.checked }))}
              />
              {t('yesLabel')}
            </label>
          )}
        </div>
      ))}

      <label htmlFor={`${uid}-phone`} className="mb-1 block text-[13px] font-medium text-neutral-700">
        {t('phoneLabelOptional')}
      </label>
      <input
        id={`${uid}-phone`}
        inputMode="numeric"
        autoComplete="tel-national"
        maxLength={10}
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        type="tel"
        className="mb-3 h-11 w-full rounded-md border border-neutral-200 px-3 text-[14px]"
      />

      {error && <p role="alert" className="mb-2 text-[12px] text-emergency-600">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className="h-11 w-full rounded-md bg-brand-600 text-[14px] font-semibold text-white disabled:opacity-40"
      >
        {submitting ? t('submitting') : t('submit')}
      </button>
    </div>
  );
}
