import { z } from 'zod';

export const analyticsSchema = z.object({
  event_type: z.string().trim().min(1).max(64),
  entity_type: z.string().trim().max(64).nullable().optional(),
  entity_id: z.string().trim().max(128).nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

export type AnalyticsInput = z.infer<typeof analyticsSchema>;
