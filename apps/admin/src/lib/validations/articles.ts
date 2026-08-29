import { z } from 'zod';

const titleTranslationsSchema = z.object({
  bn: z.string().trim().default(''),
  en: z.string().trim().default(''),
  hi: z.string().trim().default(''),
});

const baseArticleSchema = z.object({
  title_translations: titleTranslationsSchema.superRefine((val, ctx) => {
    if (!val.bn) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'বাংলা শিরোনাম বাধ্যতামূলক' });
  }),
  slug: z.string().trim().optional().default(''),
  cover_image_url: z.string().trim().optional().default(''),
  category: z.string().trim().optional().default(''),
  body_html: z.string().trim().min(1, 'বিষয়বস্তু বাধ্যতামূলক'),
  author_name: z.string().trim().optional().default(''),
  author_doctor_id: z.string().uuid().nullable().optional().default(null),
  tags: z.array(z.string().trim()).optional().default([]),
  read_time_minutes: z.preprocess((v) => (v === '' || v == null ? null : v), z.coerce.number().int().min(1).max(60).nullable().optional()),
  is_published: z.boolean().optional().default(false),
  meta_title: z.string().trim().nullable().optional().default(null),
  meta_description: z.string().trim().nullable().optional().default(null),
});

export const articleCreateSchema = baseArticleSchema;
export type ArticleCreateInput = z.infer<typeof articleCreateSchema>;
export const articleUpdateSchema = baseArticleSchema.partial();
export type ArticleUpdateInput = z.infer<typeof articleUpdateSchema>;

export const answerCreateSchema = z.object({
  question_id: z.string().uuid(),
  doctor_id: z.string().uuid('ভেরিফাইড ডাক্তার নির্বাচন করুন'),
  body: z.string().trim().min(1, 'উত্তর বাধ্যতামূলক'),
});
export type AnswerCreateInput = z.infer<typeof answerCreateSchema>;
