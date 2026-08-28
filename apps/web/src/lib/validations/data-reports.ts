import { z } from 'zod';

const VALID_REASONS = ['wrong_phone', 'wrong_address', 'wrong_hours', 'closed', 'other'] as const;
const VALID_ENTITY_TYPES = ['doctor', 'hospital', 'article', 'question', 'poll'] as const;

export const dataReportSchema = z.object({
  entity_type: z.enum(VALID_ENTITY_TYPES, { errorMap: () => ({ message: 'তথ্য অসম্পূর্ণ' }) }),
  entity_id: z.string().uuid('অসঠিক আইডি'),
  reason: z.enum(VALID_REASONS, { errorMap: () => ({ message: 'কারণ নির্বাচন করুন' }) }),
  detail: z.string().trim().max(1000, 'বিবরণ ১০০০ অক্ষরের বেশি হতে পারবে না').nullable().optional(),
});

export type DataReportInput = z.infer<typeof dataReportSchema>;
