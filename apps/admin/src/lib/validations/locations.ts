/**
 * Zod validation for admin Location mutations — mirrors the apps/web
 * `lib/validations/*` convention (validation is server-side only, never
 * bundled into client JS). Bengali error messages preserved verbatim so
 * a failed write shows the operator WHY, in their own language.
 */
import { z } from 'zod';

export const locationTypeSchema = z.enum(['state', 'district', 'sub_district', 'ward']);

const nameTranslationsSchema = z.object({
  bn: z.string().trim().default(''),
  en: z.string().trim().default(''),
  hi: z.string().trim().default(''),
});

const baseLocationSchema = z.object({
  type: locationTypeSchema,
  parent_id: z.string().uuid().nullable().optional(),
  name_translations: nameTranslationsSchema,
  slug: z.string().trim().optional().default(''),
  latitude: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : v),
    z.coerce.number().min(-90).max(90).nullable().optional()
  ),
  longitude: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : v),
    z.coerce.number().min(-180).max(180).nullable().optional()
  ),
  is_active: z.boolean().optional().default(true),
  display_order: z.coerce.number().int().optional().default(0),
});

export const locationCreateSchema = baseLocationSchema.superRefine((val, ctx) => {
  const isState = val.type === 'state';
  if (isState && val.parent_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['parent_id'], message: 'State-এর কোনো প্যারেন্ট থাকতে পারে না' });
  }
  if (!isState && !val.parent_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['parent_id'], message: 'এই স্তরে একটি প্যারেন্ট এলাকা বাধ্যতামূলক' });
  }
  if (!val.name_translations.bn) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['name_translations'], message: 'বাংলা নাম বাধ্যতামূলক' });
  }
});

export type LocationCreateInput = z.infer<typeof locationCreateSchema>;

export const locationUpdateSchema = baseLocationSchema.partial();
export type LocationUpdateInput = z.infer<typeof locationUpdateSchema>;