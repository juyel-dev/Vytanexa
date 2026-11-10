-- Remove the public direct-write path for blood donor registrations.
--
-- Public donor registration must pass through register_blood_donor(), which
-- enforces auth.uid(), required consent, name/phone/location validation,
-- one active listing per account, and the per-phone 90-day rate limit.
-- The live table's verification_status default is 'verified', so the old
-- authenticated INSERT policy allowed callers to bypass those checks and
-- publish a donor row directly.
--
-- The user app already calls the guarded RPC. Admin-only donor management
-- continues through the service_role client. Keep service_role table access.

DROP POLICY IF EXISTS authenticated_insert_own_donor ON public.blood_donors;

REVOKE INSERT ON TABLE public.blood_donors FROM PUBLIC, anon, authenticated;

-- Make the intended registration contract explicit. The function is
-- SECURITY DEFINER and obtains the user identity from auth.uid(); clients
-- cannot write donor rows directly.
REVOKE ALL ON FUNCTION public.register_blood_donor(text, text, text, uuid, boolean)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_blood_donor(text, text, text, uuid, boolean)
  TO authenticated, service_role;
