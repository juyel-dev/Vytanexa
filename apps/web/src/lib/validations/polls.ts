import { z } from 'zod';
import { getT } from '@vytanexa/i18n/server';

type Translator = Awaited<ReturnType<typeof getT<'validation'>>>;

export function pollVoteSchema(t: Translator) {
  return z.object({
    optionId: z.string().uuid(t('polls.invalidOption')),
    voterKey: z.string().trim().min(1, t('generic.incompleteData')),
  });
}

export type PollVoteInput = z.infer<ReturnType<typeof pollVoteSchema>>;
