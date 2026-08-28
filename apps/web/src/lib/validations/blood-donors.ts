import { z } from 'zod';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const;

export const bloodDonorSchema = z.object({
  name: z.string().trim().min(2, 'নাম কমপক্ষে ২ অক্ষরের হতে হবে').max(80, 'নাম খুব বড়'),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'সঠিক মোবাইল নম্বর দিন'),
  blood_group: z.enum(BLOOD_GROUPS, { errorMap: () => ({ message: 'রক্তের গ্রুপ সঠিক নয়' }) }),
  location_id: z.string().uuid('অবস্থান নির্বাচন করুন'),
  consent_contact: z.literal(true, { errorMap: () => ({ message: 'জরুরি প্রয়োজনে যোগাযোগ পাওয়ার সম্মতি প্রয়োজন' }) }),
});

export type BloodDonorInput = z.infer<typeof bloodDonorSchema>;
