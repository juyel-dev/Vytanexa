import { z } from 'zod';
import { getT } from '@vytanexa/i18n/server';

type Translator = Awaited<ReturnType<typeof getT<'validation'>>>;

const VALID_REASONS = ['wrong_phone', 'wrong_address', 'wrong_hours', 'closed', 'other'] as const;
const VALID_ENTITY_TYPES = ['doctor', 'hospital', 'article', 'question', 'poll'] as const;

export function dataReportSchema(t: Translator) {
  return z.object({
    entity_type: z.enum(VALID_ENTITY_TYPES, { errorMap: () => ({ message: t('generic.incompleteData') }) }),
    entity_id: z.string().uuid(t('dataReports.invalidId')),
    reason: z.enum(VALID_REASONS, { errorMap: () => ({ message: t('dataReports.reasonRequired') }) }),
    detail: z.string().trim().max(1000, t('dataReports.detailMax')).nullable().optional(),
  });
}

export type DataReportInput = z.infer<ReturnType<typeof dataReportSchema>>;
