import { z } from 'zod';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const;

/**
 * BLOOD-SERVICE-PLAN.md Phase A.1 — the client accepted "+91XXXXXXXXXX"
 * (placeholder said so) while the server only accepted a bare 10-digit
 * number, so a correctly-formatted submission was rejected. Normalize
 * here so both the client (via bloodDonorPhoneNormalized, used for the
 * live "can submit" check) and the server (via bloodDonorSchema, used
 * to actually validate the POST body) apply the exact same rule.
 */
export function normalizeIndianPhone(raw: string): string {
  let digits = raw.trim().replace(/[^\d]/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

const phoneField = z
  .string()
  .trim()
  .transform(normalizeIndianPhone)
  .pipe(z.string().regex(/^[6-9]\d{9}$/, 'সঠিক ১০ সংখ্যার মোবাইল নম্বর দিন'));

export const bloodDonorSchema = z.object({
  name: z.string().trim().min(2, 'নাম কমপক্ষে ২ অক্ষরের হতে হবে').max(80, 'নাম খুব বড়'),
  phone: phoneField,
  blood_group: z.enum(BLOOD_GROUPS, { errorMap: () => ({ message: 'রক্তের গ্রুপ সঠিক নয়' }) }),
  location_id: z.string().uuid('অবস্থান নির্বাচন করুন'),
  consent_contact: z.literal(true, { errorMap: () => ({ message: 'জরুরি প্রয়োজনে যোগাযোগ পাওয়ার সম্মতি প্রয়োজন' }) }),
});

export type BloodDonorInput = z.infer<typeof bloodDonorSchema>;
