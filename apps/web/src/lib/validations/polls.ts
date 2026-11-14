import { z } from 'zod';
import { getT } from '@vytanexa/i18n/server';

type Translator = Awaited<ReturnType<typeof getT<'validation'>>>;

export function pollVoteSchema(t: Translator) {
  return z.object({
    optionId: z.string().uuid(t('polls.invalidOption')),
    voterKey: z.string().uuid(t('generic.incompleteData')).optional(),
  });
}

export type PollVoteInput = z.infer<ReturnType<typeof pollVoteSchema>>;
