import { z } from 'zod';

export const reviewSchema = z.object({
  // Backward compat: `doctor_id` without `entity_type` still accepted
  doctor_id: z.string().uuid().optional(),
  entity_type: z.enum(['doctor', 'hospital']).optional(),
  entity_id: z.string().uuid().optional(),
  reviewer_name: z.string().trim().min(2, 'নাম কমপক্ষে ২ অক্ষরের হতে হবে').max(80, 'নাম খুব বড়'),
  rating: z.number().int('রেটিং পূর্ণ সংখ্যা হতে হবে').min(1, 'রেটিং ১-৫ এর মধ্যে').max(5, 'রেটিং ১-৫ এর মধ্যে'),
  review_text: z
    .string()
    .trim()
    .min(20, 'রিভিউ ২০-৫০০ অক্ষরের মধ্যে হতে হবে')
    .max(500, 'রিভিউ ২০-৫০০ অক্ষরের মধ্যে হতে হবে'),
  honeypot: z.string().optional(),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
