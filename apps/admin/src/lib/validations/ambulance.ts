import { z } from 'zod';

const nameTranslationsSchema = z.object({
  bn: z.string().trim().default(''),
  en: z.string().trim().default(''),
  hi: z.string().trim().default(''),
});

const baseAmbulanceSchema = z.object({
  name_translations: nameTranslationsSchema.superRefine((val, ctx) => {
    if (!val.bn) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'বাংলা নাম বাধ্যতামূলক' });
  }),
  location_id: z.string().uuid('এলাকা নির্বাচন করুন'),
  phone: z.string().trim().min(1, 'ফোন বাধ্যতামূলক'),
  whatsapp_number: z.string().trim().optional().default(''),
  hospital_id: z.string().uuid().nullable().optional(),
  vehicle_count: z.preprocess((v) => (v === '' || v == null ? null : v), z.coerce.number().int().min(0).nullable().optional()),
  is_icu_equipped: z.boolean().optional().default(false),
  per_km_rate: z.preprocess((v) => (v === '' || v == null ? null : v), z.coerce.number().min(0).nullable().optional()),
  coverage_radius_km: z.preprocess((v) => (v === '' || v == null ? null : v), z.coerce.number().min(0).nullable().optional()),
  is_24x7: z.boolean().optional().default(true),
  verification_status: z.enum(['pending', 'verified', 'rejected', 'suspended']).optional().default('pending'),
  is_active: z.boolean().optional().default(true),
});

export const ambulanceCreateSchema = baseAmbulanceSchema;
export type AmbulanceCreateInput = z.infer<typeof ambulanceCreateSchema>;
export const ambulanceUpdateSchema = baseAmbulanceSchema.partial();
export type AmbulanceUpdateInput = z.infer<typeof ambulanceUpdateSchema>;
