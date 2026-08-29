import { z } from 'zod';

export const pollCreateSchema = z.object({
  question: z.string().trim().min(1, 'প্রশ্ন বাধ্যতামূলক'),
  options: z.array(z.string().trim().min(1, 'অপশন ফাঁকা রাখা যাবে না')).min(2, 'অন্তত ২টি অপশন দিন').max(6, 'সর্বোচ্চ ৬টি অপশন').transform((arr) => [...new Set(arr.map((s) => s.trim()).filter(Boolean))]).superRefine((arr, ctx) => {
    if (arr.length < 2) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'অন্তত ২টি অনন্য অপশন দিন' });
  }),
  expires_at: z.preprocess((v) => (v === '' || v == null ? null : v), z.coerce.date().nullable().optional()),
  is_active: z.boolean().optional().default(true),
});

export type PollCreateInput = z.infer<typeof pollCreateSchema>;
export const pollUpdateSchema = pollCreateSchema.partial();
export type PollUpdateInput = z.infer<typeof pollUpdateSchema>;

export const notificationCreateSchema = z.object({
  type: z.enum(['general', 'emergency', 'personal']),
  title: z.string().trim().min(1, 'শিরোনাম বাধ্যতামূলক'),
  body: z.string().trim().min(1, 'বিবরণ বাধ্যতামূলক'),
  target_url: z.string().trim().optional().default(''),
  target_user_id: z.string().uuid().nullable().optional().default(null),
  show_as_banner: z.boolean().optional().default(false),
  expires_at: z.preprocess((v) => (v === '' || v == null ? null : v), z.coerce.date().nullable().optional()),
  is_active: z.boolean().optional().default(true),
});
export type NotificationCreateInput = z.infer<typeof notificationCreateSchema>;
