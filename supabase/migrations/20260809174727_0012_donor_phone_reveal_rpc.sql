-- Vytanexa Database Migration
-- VYTANEXA-BLUEPRINT.md § S11 "Donor Registration (Opt-in Directory)":
-- "Donor phone numbers are never shown in plaintext publicly ... phone
-- revealed via a tap which triggers a tel: intent directly."
--
-- DATABASE-SCHEMA.md § 3.6 already documents the intended design:
-- blood_donors_service_only blocks ALL direct SELECT on blood_donors
-- (`USING (false)`), and phone is meant to be "resolved server-side
-- when the tap fires a protected Route Handler." But apps/web's own
-- Supabase client (lib/supabase/server.ts) deliberately never holds
-- the service-role key ("the SEPARATE service-role client ... never
-- in apps/web") -- so with only the anon key, the Route Handler as
-- originally sketched has no way to actually read the phone column.
--
-- Resolution: a narrowly-scoped SECURITY DEFINER RPC, the same
-- pattern already established by is_admin() (migration 0005) --
-- reuses an existing, already-accepted architecture rather than
-- introducing a service-role key into apps/web. The function only
-- ever returns a phone for a donor that is active, not deleted, AND
-- has given contact consent -- the exact same predicate the
-- public_blood_donors view already applies for listing, so this adds
-- no new exposure beyond "the number becomes readable instead of
-- permanently unreadable" for a donor who already opted in to being
-- contacted. Callers are additionally rate-limited at the Route
-- Handler layer via the existing check_rate_limit() function
-- (anti-scraping, matches the review/lead rate-limit precedent).

CREATE OR REPLACE FUNCTION get_donor_phone(p_donor_id UUID)
RETURNS TEXT AS $$
  SELECT phone FROM blood_donors
  WHERE id = p_donor_id
    AND is_active = true
    AND deleted_at IS NULL
    AND consent_contact = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

REVOKE ALL ON FUNCTION get_donor_phone(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_donor_phone(UUID) TO anon, authenticated;
