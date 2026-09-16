import { z } from 'zod';
import { getT } from '@vytanexa/i18n/server';

type Translator = Awaited<ReturnType<typeof getT<'validation'>>>;

export function answerSchema(t: Translator) {
  return z.object({
    question_id: z.string().uuid(t('answers.invalidQuestionId')),
    body: z.string().trim().min(5, t('answers.bodyMin')).max(2000, t('answers.bodyMax')),
    author_name: z.string().trim().max(80).nullable().optional(),
  });
}

export type AnswerInput = z.infer<ReturnType<typeof answerSchema>>;
