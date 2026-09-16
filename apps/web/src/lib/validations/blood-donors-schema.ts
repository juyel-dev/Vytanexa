import { z } from 'zod';
import { getT } from '@vytanexa/i18n/server';
import { normalizeIndianPhone } from './blood-donors';

type Translator = Awaited<ReturnType<typeof getT<'validation'>>>;

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const;

/**
 * Server-only, locale-aware counterpart to blood-donors.ts's
 * normalizeIndianPhone — kept in its own module specifically so
 * `@vytanexa/i18n/server` (hard-tagged `server-only`) never ends up in
 * DonorRegistrationSheet.tsx's client bundle via a shared file.
 */
export function bloodDonorSchema(t: Translator) {
  const phoneField = z
    .string()
    .trim()
    .transform(normalizeIndianPhone)
    .pipe(z.string().regex(/^[6-9]\d{9}$/, t('bloodDonors.phoneInvalid')));

  return z.object({
    name: z.string().trim().min(2, t('name.min')).max(80, t('name.max')),
    phone: phoneField,
    blood_group: z.enum(BLOOD_GROUPS, { errorMap: () => ({ message: t('bloodDonors.groupInvalid') }) }),
    location_id: z.string().uuid(t('bloodDonors.locationRequired')),
    consent_contact: z.literal(true, { errorMap: () => ({ message: t('bloodDonors.consentRequired') }) }),
  });
}

export type BloodDonorInput = z.infer<ReturnType<typeof bloodDonorSchema>>;
