import { z } from 'zod';
import { getT } from '@vytanexa/i18n/server';

type Translator = Awaited<ReturnType<typeof getT<'validation'>>>;

/**
 * POST /api/leads — VYTANEXA-BLUEPRINT.md § S07 lead capture.
 * Mirrors the manual checks previously in route.ts so the behavior
 * is identical — only the validation mechanism changes (Zod vs ad-hoc
 * `if` blocks), per the cross-cutting TODO "Zod validation schemas for
 * every form" and S22's Architecture Summary ("react-hook-form + Zod
 * schemas shared between client validation and Route Handler server-side
 * validation — single source of truth per form"). Server-only import:
 * Route Handlers are never bundled into client JS, so Zod (~12KB) never
 * impacts the 150KB First Load JS budget.
 */
export function leadSchema(t: Translator) {
  return z.object({
    doctor_id: z.string().uuid(t('leads.invalidDoctorId')),
    chamber_id: z.string().uuid().nullable().optional(),
    patient_name: z.string().trim().min(2, t('name.min')).max(80, t('name.max')),
    patient_phone: z.string().trim().regex(/^[6-9]\d{9}$/, t('phone.invalid')),
    preferred_time: z.string().max(30).nullable().optional(),
    message: z.string().max(200, t('leads.messageMax')).nullable().optional(),
  });
}

export type LeadInput = z.infer<ReturnType<typeof leadSchema>>;
