import { z } from 'zod';

export const bloodGroupSchema = z.enum(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']);

export const inventorySchema = z.object({
  hospital_id: z.string().uuid(),
  inventory: z.array(
    z.object({
      blood_group: bloodGroupSchema,
      stock_level: z.enum(['available', 'low', 'unavailable', 'unknown']),
    })
  ),
});
export type InventoryInput = z.infer<typeof inventorySchema>;

/**
 * Admin-side donor create/edit (BLOOD-SERVICE-PLAN.md Phase C.2 +
 * deep-dive finding: staff had no way to add a phoned-in donor
 * manually). Same normalization rule as the web app's
 * `normalizeIndianPhone` (apps/web/src/lib/validations/blood-donors.ts)
 * — duplicated rather than shared since web/admin are separate Next.js
 * apps with no shared runtime package for this; keep both in sync if
 * the rule ever changes.
 */
function normalizeIndianPhone(raw: string): string {
  let digits = raw.trim().replace(/[^\d]/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

const donorPhoneSchema = z
  .string()
  .trim()
  .transform(normalizeIndianPhone)
  .pipe(z.string().regex(/^[6-9]\d{9}$/, 'সঠিক ১০ সংখ্যার মোবাইল নম্বর দিন'));

export const donorSchema = z.object({
  name: z.string().trim().min(2, 'নাম কমপক্ষে ২ অক্ষরের হতে হবে').max(80, 'নাম খুব বড়'),
  phone: donorPhoneSchema,
  blood_group: bloodGroupSchema,
  location_id: z.string().uuid('এলাকা নির্বাচন করুন'),
  verification_status: z.enum(['pending', 'verified', 'rejected', 'suspended']).optional(),
});
export type DonorInput = z.infer<typeof donorSchema>;
