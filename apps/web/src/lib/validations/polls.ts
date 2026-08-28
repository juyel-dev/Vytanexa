import { z } from 'zod';

export const pollVoteSchema = z.object({
  optionId: z.string().uuid('অসঠিক বিকল্প'),
  voterKey: z.string().trim().min(1, 'তথ্য অসম্পূর্ণ'),
});

export type PollVoteInput = z.infer<typeof pollVoteSchema>;
