import { z } from 'zod';

export const questionSchema = z.object({
  title: z.string().trim().min(10, 'শিরোনাম কমপক্ষে ১০ অক্ষরের হতে হবে').max(200, 'শিরোনাম ২০০ অক্ষরের বেশি হতে পারবে না'),
  body: z.string().trim().max(2000, 'বিবরণ ২০০০ অক্ষরের বেশি হতে পারবে না').nullable().optional(),
  category_id: z.string().uuid('বিভাগ নির্বাচন করুন'),
  is_anonymous: z.boolean().optional(),
  author_name: z.string().trim().max(80).nullable().optional(),
  author_phone: z.string().trim().max(20).nullable().optional(),
});

export type QuestionInput = z.infer<typeof questionSchema>;
