import { z } from 'zod';

/**
 * POST /api/leads — VYTANEXA-BLUEPRINT.md § S07 lead capture.
 * Mirrors the manual checks previously in route.ts so the behavior
 * is identical — only the validation mechanism changes (Zod vs ad-hoc
 * `if` blocks), per the cross-cutting TODO "Zod validation schemas for
 * every form" and S22's Architecture Summary ("react-hook-form + Zod
 * schemas shared between client validation and Route Handler server-side
 * validation — single source of truth per form"). Server-only import:
 * Route Handlers are never bundled into client JS, so Zod (~12KB) never
 * impacts the 150KB First Load JS budget.
 */
export const leadSchema = z.object({
  doctor_id: z.string().uuid('অসঠিক ডাক্তার আইডি'),
  chamber_id: z.string().uuid().nullable().optional(),
  patient_name: z.string().trim().min(2, 'নাম কমপক্ষে ২ অক্ষরের হতে হবে').max(80, 'নাম খুব বড়'),
  patient_phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'সঠিক মোবাইল নম্বর দিন'),
  preferred_time: z.string().max(30).nullable().optional(),
  message: z.string().max(200, 'বার্তা ২০০ অক্ষরের বেশি হতে পারবে না').nullable().optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;
