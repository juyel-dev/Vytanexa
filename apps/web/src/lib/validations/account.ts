import { z } from 'zod';

/**
 * PATCH /api/account/profile — TODO.md Phase 8.6. Was hand-rolled
 * `if` checks with two fields (`preferred_language`,
 * `default_location_id`) passed straight through with no validation
 * at all — every other write route in the app uses a schema from
 * this folder, so this brings profile in line and closes that gap.
 * `preferred_language` values match `onboarding/LanguageStep.tsx`'s
 * `LANGUAGES` list (bn/en/hi) — the only three the rest of the app
 * ever writes.
 */
export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2, 'নাম কমপক্ষে ২ অক্ষরের হতে হবে').max(100).optional(),
  email: z
    .string()
    .trim()
    .email('ইমেইল সঠিক নয়')
    .max(255)
    .nullable()
    .optional()
    .or(z.literal('')),
  preferred_language: z.enum(['bn', 'en', 'hi']).optional(),
  default_location_id: z.string().uuid('অবৈধ লোকেশন').nullable().optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
