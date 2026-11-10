-- RECONSTRUCTED REPLAY MIGRATION.
-- The original SQL was applied to the hosted project but was not committed
-- to Git. Current live policy confirms the scalar-subquery auth.uid() form.
-- This replay file reproduces that documented result; it is not claimed to be
-- byte-identical to the original SQL.

DROP POLICY IF EXISTS authenticated_insert_own_donor
  ON public.blood_donors;

CREATE POLICY authenticated_insert_own_donor
  ON public.blood_donors
  FOR INSERT
  TO authenticated
  WITH CHECK (
    consent_contact = true
    AND user_id = (SELECT auth.uid())
  );
