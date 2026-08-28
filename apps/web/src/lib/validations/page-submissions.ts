import { z } from 'zod';

export const pageSubmissionSchema = z.object({
  page_id: z.string().uuid('অসঠিক পেজ আইডি'),
  block_index: z.number().int().min(0),
  submission_data: z.record(z.unknown()),
  submitter_phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'সঠিক মোবাইল নম্বর দিন').nullable().optional(),
});

export type PageSubmissionInput = z.infer<typeof pageSubmissionSchema>;
