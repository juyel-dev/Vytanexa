-- RECONSTRUCTED REPLAY MIGRATION.
-- The original SQL was applied to the hosted project via Supabase MCP and was
-- not committed to Git. This file recreates the documented/live resulting
-- state for clean local replay; it is not claimed to be byte-identical to the
-- original SQL. Provenance and limitations are recorded in
-- docs/operations/MIGRATION-LEDGER-RECONCILIATION-2026-11-10.md.

ALTER TABLE public.blood_donors
  ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN verification_status public.verification_status NOT NULL DEFAULT 'verified';

DROP INDEX IF EXISTS public.idx_donors_blood_group;
DROP INDEX IF EXISTS public.idx_donors_location;

ALTER TABLE public.blood_donors
  DROP COLUMN is_active;

CREATE INDEX idx_blood_donors_status
  ON public.blood_donors (verification_status)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_blood_donors_user
  ON public.blood_donors (user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX uq_blood_donors_one_per_user
  ON public.blood_donors (user_id)
  WHERE deleted_at IS NULL AND user_id IS NOT NULL;

DROP POLICY IF EXISTS public_insert_donor ON public.blood_donors;
CREATE POLICY authenticated_insert_own_donor
  ON public.blood_donors
  FOR INSERT
  TO authenticated
  WITH CHECK (consent_contact = true AND user_id = auth.uid());

CREATE OR REPLACE VIEW public.public_blood_donors AS
  SELECT id, name, blood_group, location_id, last_donated_at
  FROM public.blood_donors
  WHERE verification_status = 'verified'
    AND deleted_at IS NULL
    AND consent_contact = true;

REVOKE SELECT ON public.public_blood_donors FROM anon;
GRANT SELECT ON public.public_blood_donors TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_donor_phone(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_donor_phone(uuid) TO authenticated;
