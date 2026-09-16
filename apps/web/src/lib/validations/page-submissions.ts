import { z } from 'zod';
import { getT } from '@vytanexa/i18n/server';

type Translator = Awaited<ReturnType<typeof getT<'validation'>>>;

export function pageSubmissionSchema(t: Translator) {
  return z.object({
    page_id: z.string().uuid(t('pageSubmissions.invalidPageId')),
    block_index: z.number().int().min(0),
    submission_data: z.record(z.unknown()),
    submitter_phone: z.string().trim().regex(/^[6-9]\d{9}$/, t('phone.invalid')).nullable().optional(),
  });
}

export type PageSubmissionInput = z.infer<ReturnType<typeof pageSubmissionSchema>>;
