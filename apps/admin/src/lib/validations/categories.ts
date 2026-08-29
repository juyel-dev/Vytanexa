import { z } from 'zod';

const nameTranslationsSchema = z.object({
  bn: z.string().trim().default(''),
  en: z.string().trim().default(''),
  hi: z.string().trim().default(''),
});

export const categoryCreateSchema = z.object({
  name_translations: nameTranslationsSchema.superRefine((val, ctx) => {
    if (!val.bn) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'বাংলা নাম বাধ্যতামূলক' });
  }),
  slug: z.string().trim().optional().default(''),
  icon_key: z.string().trim().nullable().optional().default(null),
  search_keywords: z.array(z.string().trim()).optional().default([]),
  display_order: z.coerce.number().int().optional().default(0),
  is_visible_home: z.boolean().optional().default(true),
  is_active: z.boolean().optional().default(true),
});

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export const categoryUpdateSchema = categoryCreateSchema.partial();
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;