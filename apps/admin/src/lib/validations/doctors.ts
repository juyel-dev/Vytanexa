import { z } from 'zod';

const nameTranslationsSchema = z.object({
  bn: z.string().trim().default(''),
  en: z.string().trim().default(''),
  hi: z.string().trim().default(''),
});

const verificationSchema = z.enum(['pending', 'verified', 'rejected', 'suspended']);

const scheduleEntrySchema = z.object({
  day: z.enum(['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri']),
  open: z.string().regex(/^\d{2}:\d{2}$/, 'সময় HH:MM ফরম্যাটে দিন'),
  close: z.string().regex(/^\d{2}:\d{2}$/, 'সময় HH:MM ফরম্যাটে দিন'),
});

export const chamberInputSchema = z.object({
  id: z.string().uuid().optional(), // present for existing chambers on update
  chamber_name: z.string().trim().min(1, 'চেম্বার নাম বাধ্যতামূলক'),
  location_id: z.string().uuid('এলাকা নির্বাচন করুন'),
  address_line: z.string().trim().min(1, 'ঠিকানা বাধ্যতামূলক'),
  phone: z.string().trim().min(1, 'ফোন বাধ্যতামূলক'),
  whatsapp_number: z.string().trim().optional().default(''),
  map_link: z.string().trim().optional().default(''),
  latitude: z.preprocess((v) => (v === '' || v == null ? null : v), z.coerce.number().min(-90).max(90).nullable().optional()),
  longitude: z.preprocess((v) => (v === '' || v == null ? null : v), z.coerce.number().min(-180).max(180).nullable().optional()),
  consultation_fee: z.preprocess((v) => (v === '' || v == null ? null : v), z.coerce.number().min(0).nullable().optional()),
  schedule: z.array(scheduleEntrySchema).optional().default([]),
  is_primary: z.boolean().optional().default(false),
  display_order: z.coerce.number().int().optional().default(0),
  is_active: z.boolean().optional().default(true),
});

const baseDoctorSchema = z.object({
  name_translations: nameTranslationsSchema.superRefine((val, ctx) => {
    if (!val.bn) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'বাংলা নাম বাধ্যতামূলক' });
  }),
  slug: z.string().trim().optional().default(''),
  photo_url: z.string().trim().optional().default(''),
  category_id: z.string().uuid('বিভাগ নির্বাচন করুন'),
  degree: z.array(z.string().trim()).optional().default([]),
  bmdc_registration_no: z.string().trim().optional().default(''),
  experience_years: z.coerce.number().int().min(0).max(80).optional().default(0),
  bio_translations: z
    .object({ bn: z.string().trim().default(''), en: z.string().trim().default(''), hi: z.string().trim().default('') })
    .optional()
    .default({ bn: '', en: '', hi: '' }),
  expertise_tags: z.array(z.string().trim()).optional().default([]),
  treats_conditions: z.array(z.string().trim()).optional().default([]),
  languages: z.array(z.string().trim()).optional().default(['bn']),
  search_aliases: z.array(z.string().trim()).optional().default([]),
  consultation_fee_min: z.preprocess((v) => (v === '' || v == null ? null : v), z.coerce.number().min(0).nullable().optional()),
  consultation_fee_max: z.preprocess((v) => (v === '' || v == null ? null : v), z.coerce.number().min(0).nullable().optional()),
  whatsapp_number: z.string().trim().optional().default(''),
  verification_status: verificationSchema.optional().default('pending'),
  is_available: z.boolean().optional().default(true),
  is_featured: z.boolean().optional().default(false),
  featured_priority: z.coerce.number().int().optional().default(0),
  chambers: z.array(chamberInputSchema).optional().default([]),
});

export const doctorCreateSchema = baseDoctorSchema.superRefine((val, ctx) => {
  if (val.consultation_fee_min != null && val.consultation_fee_max != null && val.consultation_fee_max < val.consultation_fee_min) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['consultation_fee_max'], message: 'সর্বোচ্চ ফি সর্বনিম্নের চেয়ে কম হতে পারে না' });
  }
});

export type DoctorCreateInput = z.infer<typeof doctorCreateSchema>;
export type ChamberInput = z.infer<typeof chamberInputSchema>;

// Update: all fields optional (partial), but chambers if provided must be valid.
export const doctorUpdateSchema = baseDoctorSchema.partial().extend({
  chambers: z.array(chamberInputSchema).optional(),
});
export type DoctorUpdateInput = z.infer<typeof doctorUpdateSchema>;
