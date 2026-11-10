-- Fix donor phone reveal after the donor lifecycle schema moved from
-- is_active to verification_status (historical donor migration 0017).
--
-- The HTTP route also applies a per-IP / per-donor limit. This RPC enforces
-- a second, database-side per-account limit so direct RPC callers cannot
-- bypass the application limiter.
--
-- The helper lives in a non-exposed schema and is not executable by API
-- roles. The public function is the only caller and checks auth.uid() first.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.consume_donor_phone_rate_limit(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_key text := 'donor_phone:' || pg_catalog.md5(p_user_id::text);
  v_count bigint;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Serialize requests from one account so simultaneous calls cannot all
  -- pass a count-then-insert check.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_key, 0)
  );

  SELECT count(*)
    INTO v_count
  FROM public.rate_limit_events
  WHERE limit_key = v_key
    AND created_at > pg_catalog.now() - interval '1 hour';

  IF v_count >= 5 THEN
    RETURN false;
  END IF;

  INSERT INTO public.rate_limit_events(limit_key)
  VALUES (v_key);

  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION private.consume_donor_phone_rate_limit(uuid)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_donor_phone(p_donor_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_phone text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'authentication_required';
  END IF;

  IF NOT private.consume_donor_phone_rate_limit(v_user_id) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P4290',
      MESSAGE = 'donor_phone_rate_limited';
  END IF;

  SELECT d.phone
    INTO v_phone
  FROM public.blood_donors AS d
  WHERE d.id = p_donor_id
    AND d.verification_status = 'verified'
    AND d.deleted_at IS NULL
    AND d.consent_contact = true;

  RETURN v_phone;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_donor_phone(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_donor_phone(uuid) TO authenticated, service_role;
