-- RECONSTRUCTED REPLAY MIGRATION.
-- The original SQL was applied to the hosted project but was not committed
-- to Git. Current live catalog confirms the intended security_invoker setting.
-- This replay file reproduces that documented result; it is not claimed to be
-- byte-identical to the original SQL.

ALTER VIEW public.public_blood_donors
  SET (security_invoker = true);
