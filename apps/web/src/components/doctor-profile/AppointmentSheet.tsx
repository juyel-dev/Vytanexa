'use client';

import { useState } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import type { DoctorDetail } from '@/lib/queries/doctor-detail';

type Chamber = DoctorDetail['chambers'][number];

const TIME_OPTIONS = [
  ['any', 'যেকোনো সময়'],
  ['morning', 'সকাল'],
  ['afternoon', 'দুপুর'],
  ['evening', 'সন্ধ্যা'],
];

/**
 * Appointment Lead Capture — VYTANEXA-BLUEPRINT.md § S07. Direct call/
 * WhatsApp always available alongside the form (never gated behind
 * it) per spec.
 */
export function AppointmentSheet({
  open,
  onClose,
  doctorId,
  doctorName,
  chambers,
  whatsappNumber,
}: {
  open: boolean;
  onClose: () => void;
  doctorId: string;
  doctorName: string;
  chambers: Chamber[];
  whatsappNumber: string | null;
}) {
  const [chamberId, setChamberId] = useState(chambers[0]?.id ?? '');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredTime, setPreferredTime] = useState('any');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isValidPhone = /^[6-9]\d{9}$/.test(phone);
  const canSubmit = name.trim().length >= 2 && isValidPhone;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch('/api/leads', {
      method: 'POST',
      body: JSON.stringify({
        doctor_id: doctorId,
        chamber_id: chamberId || null,
        patient_name: name,
        patient_phone: phone,
        preferred_time: preferredTime,
        message: message || null,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? 'পাঠাতে সমস্যা হয়েছে');
      return;
    }
    setSuccess(true);
    setTimeout(() => {
      onClose();
      setSuccess(false);
      setName('');
      setPhone('');
      setMessage('');
    }, 1500);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="অ্যাপয়েন্টমেন্ট অনুরোধ">
      {success ? (
        <p className="py-8 text-center text-[15px] font-semibold text-life-600">
          ✅ অনুরোধ পাঠানো হয়েছে! চেম্বার থেকে শীঘ্রই যোগাযোগ করা হবে।
        </p>
      ) : (
        <>
          <p className="mb-3 text-[14px] text-neutral-600">{doctorName}</p>

          {chambers.length > 1 && (
            <>
              <label className="mb-1 block text-[13px] font-medium text-neutral-700">
                চেম্বার বেছে নিন *
              </label>
              <div className="mb-3 flex flex-col gap-1.5">
                {chambers.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 text-[13px] text-neutral-700"
                  >
                    <input
                      type="radio"
                      checked={chamberId === c.id}
                      onChange={() => setChamberId(c.id)}
                    />
                    {c.chamber_name}
                  </label>
                ))}
              </div>
            </>
          )}

          <label className="mb-1 block text-[13px] font-medium text-neutral-700">
            আপনার নাম *
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mb-3 h-11 w-full rounded-md border border-neutral-200 px-3 text-[14px]"
          />

          <label className="mb-1 block text-[13px] font-medium text-neutral-700">
            মোবাইল নম্বর *
          </label>
          <div className="mb-3 flex h-11 items-center rounded-md border border-neutral-200 px-3">
            <span className="mr-2 text-[13px] text-neutral-500">🇮🇳 +91</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              inputMode="numeric"
              className="flex-1 text-[14px] outline-none"
            />
          </div>

          <label className="mb-1 block text-[13px] font-medium text-neutral-700">
            পছন্দের সময়
          </label>
          <select
            value={preferredTime}
            onChange={(e) => setPreferredTime(e.target.value)}
            className="mb-3 h-11 w-full rounded-md border border-neutral-200 px-3 text-[14px]"
          >
            {TIME_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <label className="mb-1 block text-[13px] font-medium text-neutral-700">
            বার্তা (ঐচ্ছিক)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 200))}
            placeholder="যেমন: জ্বরের সমস্যার জন্য দেখাতে চাই"
            rows={2}
            className="mb-3 w-full rounded-md border border-neutral-200 px-3 py-2 text-[14px]"
          />

          {error && <p className="mb-2 text-[12px] text-emergency-600">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="h-12 w-full rounded-md bg-brand-600 text-[15px] font-semibold text-white disabled:opacity-40"
          >
            {submitting ? 'পাঠানো হচ্ছে...' : 'অনুরোধ পাঠান'}
          </button>

          <div className="my-3 flex items-center gap-2">
            <span className="h-px flex-1 bg-neutral-200" />
            <span className="text-[12px] text-neutral-400">অথবা</span>
            <span className="h-px flex-1 bg-neutral-200" />
          </div>

          <div className="flex gap-2">
            <a
              href={`tel:${chambers[0]?.phone ?? ''}`}
              className="h-11 flex-1 rounded-md border border-neutral-200 text-center text-[13px] font-semibold leading-[44px] text-neutral-700"
            >
              📞 সরাসরি কল করুন
            </a>
            {whatsappNumber && (
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 flex-1 rounded-md border border-neutral-200 text-center text-[13px] font-semibold leading-[44px] text-neutral-700"
              >
                💬 WhatsApp করুন
              </a>
            )}
          </div>

          <p className="mt-3 text-center text-[11px] text-neutral-400">
            এটি সরাসরি অ্যাপয়েন্টমেন্ট বুকিং নয়। চেম্বার থেকে যোগাযোগ করা হবে।
          </p>
        </>
      )}
    </BottomSheet>
  );
}
