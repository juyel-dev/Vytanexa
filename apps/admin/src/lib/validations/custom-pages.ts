import { z } from 'zod';

export const customPageCreateSchema = z.object({
  title: z.string().trim().min(1, 'শিরোনাম বাধ্যতামূলক'),
  slug: z.string().trim().optional().default(''),
  blocks: z.array(z.record(z.unknown())).optional().default([]),
  show_in_menu: z.boolean().optional().default(false),
  menu_icon: z.string().trim().nullable().optional().default(null),
  menu_order: z.coerce.number().int().optional().default(0),
  is_published: z.boolean().optional().default(false),
  meta_title: z.string().trim().nullable().optional().default(null),
  meta_description: z.string().trim().nullable().optional().default(null),
  og_image: z.string().trim().nullable().optional().default(null),
});

export type CustomPageCreateInput = z.infer<typeof customPageCreateSchema>;
export const customPageUpdateSchema = customPageCreateSchema.partial();
export type CustomPageUpdateInput = z.infer<typeof customPageUpdateSchema>;
