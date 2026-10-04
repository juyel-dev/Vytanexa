import { z } from 'zod';
import { getT } from '@vytanexa/i18n/server';

type Translator = Awaited<ReturnType<typeof getT<'validation'>>>;

export function pageSubmissionSchema(t: Translator) {
  return z.object({
    page_id: z.string().uuid(t('pageSubmissions.invalidPageId')),
    block_index: z.number().int().min(0),
    // Unbounded before: one request could store a multi-MB blob in
    // page_submissions. Real forms are a handful of short fields.
    submission_data: z
      .record(z.unknown())
      .refine((d) => JSON.stringify(d).length <= 10_000, t('generic.validationFailed')),
    submitter_phone: z.string().trim().regex(/^[6-9]\d{9}$/, t('phone.invalid')).nullable().optional(),
  });
}

export type PageSubmissionInput = z.infer<ReturnType<typeof pageSubmissionSchema>>;
