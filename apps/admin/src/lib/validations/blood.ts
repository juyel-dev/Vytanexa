import { z } from 'zod';

export const bloodGroupSchema = z.enum(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']);

export const inventorySchema = z.object({
  hospital_id: z.string().uuid(),
  inventory: z.array(
    z.object({
      blood_group: bloodGroupSchema,
      stock_level: z.enum(['available', 'low', 'unavailable', 'unknown']),
    })
  ),
});
export type InventoryInput = z.infer<typeof inventorySchema>;
