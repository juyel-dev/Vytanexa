import { z } from 'zod';

export const adminCreateSchema = z.object({
  name: z.string().trim().min(1, 'নাম বাধ্যতামূলক'),
  email: z.string().trim().email('সঠিক ইমেইল দিন').toLowerCase(),
  role: z.enum(['super_admin', 'admin', 'moderator', 'editor']),
  permissions: z.record(z.boolean()).optional().default({}),
});

export type AdminCreateInput = z.infer<typeof adminCreateSchema>;

export const adminUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  role: z.enum(['super_admin', 'admin', 'moderator', 'editor']).optional(),
  permissions: z.record(z.boolean()).optional(),
  is_active: z.boolean().optional(),
});
export type AdminUpdateInput = z.infer<typeof adminUpdateSchema>;
