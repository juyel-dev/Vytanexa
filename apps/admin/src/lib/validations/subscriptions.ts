import { z } from 'zod';

export const tierSchema = z.enum(['free', 'basic', 'pro', 'premium']);
export const placementSchema = z.enum(['homepage_banner', 'native_feed']);

export const planUpdateSchema = z.object({
  name_translations: z.object({ bn: z.string().trim().default(''), en: z.string().trim().default(''), hi: z.string().trim().default('') }).optional(),
  applies_to: z.array(z.enum(['doctor', 'hospital'])).min(1).optional(),
  price_monthly: z.preprocess((v) => (v === '' || v == null ? 0 : v), z.coerce.number().min(0)).optional(),
  price_yearly: z.preprocess((v) => (v === '' || v == null ? null : v), z.coerce.number().min(0).nullable().optional()),
  benefits: z.record(z.unknown()).optional(),
  is_active: z.boolean().optional(),
});
export type PlanUpdateInput = z.infer<typeof planUpdateSchema>;

export const subscriptionCreateSchema = z.object({
  entity_type: z.enum(['doctor', 'hospital']),
  entity_id: z.string().uuid(),
  plan_id: z.string().uuid(),
  status: z.enum(['active', 'expired', 'cancelled', 'trial']).optional().default('active'),
  expires_at: z.preprocess((v) => (v === '' || v == null ? null : v), z.coerce.date().nullable().optional()),
  auto_renew: z.boolean().optional().default(false),
});
export type SubscriptionCreateInput = z.infer<typeof subscriptionCreateSchema>;

const baseAdSchema = z.object({
  placement: placementSchema,
  sponsor_name: z.string().trim().min(1, 'স্পন্সরের নাম বাধ্যতামূলক'),
  image_url: z.string().trim().min(1, 'ছবি বাধ্যতামূলক'),
  target_url: z.string().trim().min(1, 'লিংক বাধ্যতামূলক'),
  display_order: z.coerce.number().int().optional().default(0),
  start_date: z.string().trim().min(1, 'শুরু তারিখ বাধ্যতামূলক'),
  end_date: z.string().trim().min(1, 'শেষ তারিখ বাধ্যতামূলক'),
  is_active: z.boolean().optional().default(true),
});

export const adCreateSchema = baseAdSchema.superRefine((val, ctx) => {
  if (val.start_date && val.end_date && val.end_date < val.start_date) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['end_date'], message: 'শেষ তারিখ শুরুর আগে হতে পারে না' });
  }
});
export type AdCreateInput = z.infer<typeof adCreateSchema>;
export const adUpdateSchema = baseAdSchema.partial();
export type AdUpdateInput = z.infer<typeof adUpdateSchema>;
