/**
 * BLOOD-SERVICE-PLAN.md Phase A.1 — the client accepted "+91XXXXXXXXXX"
 * (placeholder said so) while the server only accepted a bare 10-digit
 * number, so a correctly-formatted submission was rejected. Normalize
 * here so both the client (via bloodDonorPhoneNormalized, used for the
 * live "can submit" check) and the server (via bloodDonorSchema, used
 * to actually validate the POST body) apply the exact same rule.
 *
 * Deliberately kept in its own module, with no i18n import: it's
 * imported directly by DonorRegistrationSheet.tsx (`'use client'`),
 * and `@vytanexa/i18n/server` is hard-tagged `server-only` — pulling it
 * into this file would break the client bundle for every consumer of
 * this function, not just the schema. See blood-donors-schema.ts for
 * the localized Zod schema built on top of this.
 */
export function normalizeIndianPhone(raw: string): string {
  let digits = raw.trim().replace(/[^\d]/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}
