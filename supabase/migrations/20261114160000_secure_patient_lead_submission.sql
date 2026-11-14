-- Patient appointment requests must pass through this validated database
-- contract. The public table INSERT policy previously let callers bypass the
-- Next.js Zod checks, doctor/chamber relationship validation and rate limit.
--
-- The public API wrapper is SECURITY INVOKER. The private implementation is
-- SECURITY DEFINER so it can insert after client table INSERT is revoked.
-- user_id, source, status and timestamps are derived by the database.

CREATE OR REPLACE FUNCTION private.submit_patient_lead_impl(
  p_doctor_id uuid,
  p_chamber_id uuid,
  p_patient_name text,
  p_patient_phone text,
  p_preferred_time text,
  p_message text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_name text := pg_catalog.btrim(COALESCE(p_patient_name, ''));
  v_phone text := pg_catalog.btrim(COALESCE(p_patient_phone, ''));
  v_preferred_time text := NULLIF(pg_catalog.btrim(COALESCE(p_preferred_time, '')), '');
  v_message text := NULLIF(pg_catalog.btrim(COALESCE(p_message, '')), '');
  v_rate_key text;
  v_recent_count bigint;
  v_user_id uuid := auth.uid();
BEGIN
  IF p_doctor_id IS NULL THEN
    RETURN pg_catalog.jsonb_build_object('error', 'invalid_doctor');
  END IF;

  IF pg_catalog.char_length(v_name) NOT BETWEEN 2 AND 80 THEN
    RETURN pg_catalog.jsonb_build_object('error', 'invalid_name');
  END IF;

  IF v_phone !~ '^[6-9][0-9]{9}$' THEN
    RETURN pg_catalog.jsonb_build_object('error', 'invalid_phone');
  END IF;

  IF v_preferred_time IS NOT NULL
     AND v_preferred_time NOT IN ('any', 'morning', 'afternoon', 'evening') THEN
    RETURN pg_catalog.jsonb_build_object('error', 'invalid_preferred_time');
  END IF;

  IF v_message IS NOT NULL AND pg_catalog.char_length(v_message) > 200 THEN
    RETURN pg_catalog.jsonb_build_object('error', 'invalid_message');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.doctors AS d
    WHERE d.id = p_doctor_id
      AND d.verification_status = 'verified'::public.verification_status
      AND d.deleted_at IS NULL
  ) THEN
    RETURN pg_catalog.jsonb_build_object('error', 'doctor_unavailable');
  END IF;

  IF p_chamber_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.chambers AS c
    WHERE c.id = p_chamber_id
      AND c.doctor_id = p_doctor_id
      AND c.is_active = true
      AND c.deleted_at IS NULL
  ) THEN
    RETURN pg_catalog.jsonb_build_object('error', 'invalid_chamber');
  END IF;

  -- Hash phone + doctor so the private limiter table never stores patient
  -- phone numbers in plaintext. Serialize concurrent requests for this
  -- pair so the 3-per-24-hour limit cannot be raced.
  v_rate_key :=
    'patient_lead:' ||
    pg_catalog.md5(p_doctor_id::text || ':' || v_phone);

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_rate_key, 0)
  );

  SELECT pg_catalog.count(*)
    INTO v_recent_count
  FROM public.rate_limit_events AS events
  WHERE events.limit_key = v_rate_key
    AND events.created_at > pg_catalog.now() - interval '24 hours';

  IF v_recent_count >= 3 THEN
    RETURN pg_catalog.jsonb_build_object('error', 'rate_limited');
  END IF;

  INSERT INTO public.rate_limit_events (limit_key)
  VALUES (v_rate_key);

  INSERT INTO public.leads (
    doctor_id,
    chamber_id,
    patient_name,
    patient_phone,
    preferred_time,
    message,
    source,
    status,
    user_id
  )
  VALUES (
    p_doctor_id,
    p_chamber_id,
    v_name,
    v_phone,
    v_preferred_time,
    v_message,
    'profile_page',
    'new'::public.lead_status,
    v_user_id
  );

  RETURN pg_catalog.jsonb_build_object('success', true);
END;
$function$;

GRANT USAGE ON SCHEMA private TO anon, authenticated;

REVOKE ALL ON FUNCTION private.submit_patient_lead_impl(uuid, uuid, text, text, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.submit_patient_lead_impl(uuid, uuid, text, text, text, text)
  TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_patient_lead(
  p_doctor_id uuid,
  p_chamber_id uuid,
  p_patient_name text,
  p_patient_phone text,
  p_preferred_time text DEFAULT NULL,
  p_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
  SELECT private.submit_patient_lead_impl(
    p_doctor_id,
    p_chamber_id,
    p_patient_name,
    p_patient_phone,
    p_preferred_time,
    p_message
  );
$function$;

REVOKE ALL ON FUNCTION public.submit_patient_lead(uuid, uuid, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_patient_lead(uuid, uuid, text, text, text, text)
  TO anon, authenticated;

-- The BFF / RPC is the only public write path. Preserve authenticated own-lead
-- history reads, but remove all direct client table DML.
DROP POLICY IF EXISTS leads_public_insert ON public.leads;
REVOKE ALL ON TABLE public.leads FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.leads TO authenticated;
