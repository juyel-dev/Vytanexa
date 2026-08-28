import { z } from 'zod';

export const answerSchema = z.object({
  question_id: z.string().uuid('অসঠিক প্রশ্ন আইডি'),
  body: z.string().trim().min(5, 'উত্তর কমপক্ষে ৫ অক্ষরের হতে হবে').max(2000, 'উত্তর ২০০০ অক্ষরের বেশি হতে পারবে না'),
  author_name: z.string().trim().max(80).nullable().optional(),
});

export type AnswerInput = z.infer<typeof answerSchema>;
