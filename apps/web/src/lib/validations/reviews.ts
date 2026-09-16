import { z } from 'zod';
import { getT } from '@vytanexa/i18n/server';

type Translator = Awaited<ReturnType<typeof getT<'validation'>>>;

export function reviewSchema(t: Translator) {
  return z.object({
    // Backward compat: `doctor_id` without `entity_type` still accepted
    doctor_id: z.string().uuid().optional(),
    entity_type: z.enum(['doctor', 'hospital']).optional(),
    entity_id: z.string().uuid().optional(),
    reviewer_name: z
      .string()
      .trim()
      .min(2, t('name.min'))
      .max(80, t('name.max')),
    rating: z
      .number()
      .int(t('reviews.ratingInt'))
      .min(1, t('reviews.ratingRange'))
      .max(5, t('reviews.ratingRange')),
    review_text: z.string().trim().min(20, t('reviews.textLength')).max(500, t('reviews.textLength')),
    honeypot: z.string().optional(),
  });
}

export type ReviewInput = z.infer<ReturnType<typeof reviewSchema>>;
