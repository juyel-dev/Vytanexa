import { z } from 'zod';
import { getT } from '@vytanexa/i18n/server';

type Translator = Awaited<ReturnType<typeof getT<'validation'>>>;

export function questionSchema(t: Translator) {
  return z.object({
    title: z.string().trim().min(10, t('questions.titleMin')).max(200, t('questions.titleMax')),
    body: z.string().trim().max(2000, t('questions.bodyMax')).nullable().optional(),
    category_id: z.string().uuid(t('questions.categoryRequired')),
    is_anonymous: z.boolean().optional(),
    author_name: z.string().trim().max(80).nullable().optional(),
    author_phone: z.string().trim().max(20).nullable().optional(),
  });
}

export type QuestionInput = z.infer<ReturnType<typeof questionSchema>>;
