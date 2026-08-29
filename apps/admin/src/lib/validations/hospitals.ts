import { z } from 'zod';

const nameTranslationsSchema = z.object({
  bn: z.string().trim().default(''),
  en: z.string().trim().default(''),
  hi: z.string().trim().default(''),
});

export const hospitalTypeSchema = z.enum(['hospital', 'clinic', 'diagnostic', 'nursing_home']);
export const verificationSchema = z.enum(['pending', 'verified', 'rejected', 'suspended']);

const operatingHoursSchema = z
  .object({
    is_24x7: z.boolean().optional().default(false),
    schedule: z
      .array(
        z.object({
          day: z.enum(['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri']),
          open: z.string().regex(/^\d{2}:\d{2}$/),
          close: z.string().regex(/^\d{2}:\d{2}$/),
        })
      )
      .optional()
      .default([]),
  })
  .optional()
  .default({ is_24x7: false, schedule: [] });

const baseHospitalSchema = z.object({
  name_translations: nameTranslationsSchema.superRefine((val, ctx) => {
    if (!val.bn) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'বাংলা নাম বাধ্যতামূলক' });
  }),
  slug: z.string().trim().optional().default(''),
  type: hospitalTypeSchema,
  cover_image_url: z.string().trim().optional().default(''),
  gallery_images: z.array(z.string().trim()).max(8).optional().default([]),
  location_id: z.string().uuid('এলাকা নির্বাচন করুন'),
  address_line: z.string().trim().min(1, 'ঠিকানা বাধ্যতামূলক'),
  latitude: z.preprocess((v) => (v === '' || v == null ? null : v), z.coerce.number().min(-90).max(90).nullable().optional()),
  longitude: z.preprocess((v) => (v === '' || v == null ? null : v), z.coerce.number().min(-180).max(180).nullable().optional()),
  map_link: z.string().trim().optional().default(''),
  phone: z.string().trim().min(1, 'ফোন বাধ্যতামূলক'),
  whatsapp_number: z.string().trim().optional().default(''),
  description_translations: z
    .object({ bn: z.string().trim().default(''), en: z.string().trim().default(''), hi: z.string().trim().default('') })
    .optional()
    .default({ bn: '', en: '', hi: '' }),
  services: z.array(z.string().trim()).optional().default([]),
  facility_tags: z.array(z.string().trim()).optional().default([]),
  has_emergency_dept: z.boolean().optional().default(false),
  operating_hours: operatingHoursSchema,
  verification_status: verificationSchema.optional().default('pending'),
  is_featured: z.boolean().optional().default(false),
  is_trending: z.boolean().optional().default(false),
  featured_priority: z.coerce.number().int().optional().default(0),
});

export const hospitalCreateSchema = baseHospitalSchema;
export type HospitalCreateInput = z.infer<typeof hospitalCreateSchema>;

export const hospitalUpdateSchema = baseHospitalSchema.partial();
export type HospitalUpdateInput = z.infer<typeof hospitalUpdateSchema>;
