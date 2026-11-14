-- Make public question upvotes a narrow, atomic RPC operation.
--
-- The browser stores a random per-device UUID in localStorage. That UUID is a
-- bearer-style dedup key, not an authenticated identity; this is explicitly
-- device-level engagement protection, not an anti-fraud boundary. Keep it
-- private by removing direct SELECT from question_upvotes. Callers can only
-- toggle their own row when they know their own device key.
--
-- The API-facing wrapper is SECURITY INVOKER. The implementation lives in
-- the non-exposed private schema and is SECURITY DEFINER so the count trigger
-- can update questions.upvote_count despite direct table DML being revoked.

CREATE OR REPLACE FUNCTION private.toggle_question_upvote_impl(
  p_question_id uuid,
  p_voter_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_voter_key text := pg_catalog.lower(pg_catalog.btrim(p_voter_key));
  v_headers jsonb;
  v_forwarded_for text;
  v_ip_bucket text;
  v_device_bucket text;
  v_count bigint;
  v_existing_id uuid;
BEGIN
  IF p_question_id IS NULL
     OR v_voter_key IS NULL
     OR v_voter_key !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN pg_catalog.jsonb_build_object('error', 'invalid_voter_key');
  END IF;

  -- Do not let direct RPC callers bypass the community feature gate.
  IF NOT EXISTS (
    SELECT 1
    FROM public.app_settings AS settings
    WHERE settings.id = 1
      AND settings.features -> 'community_qa' = 'true'::jsonb
  ) THEN
    RETURN pg_catalog.jsonb_build_object('error', 'feature_disabled');
  END IF;

  -- Only approved, non-deleted questions can receive public votes.
  IF NOT EXISTS (
    SELECT 1
    FROM public.questions AS questions
    WHERE questions.id = p_question_id
      AND questions.status = 'approved'::public.moderation_status
      AND questions.deleted_at IS NULL
  ) THEN
    RETURN pg_catalog.jsonb_build_object('error', 'question_unavailable');
  END IF;

  -- Supabase/PostgREST supplies request.headers. Use the first forwarded IP
  -- only as an additional abuse bucket; the device UUID remains the stable
  -- fallback for local/test environments where no request headers exist.
  v_headers := NULLIF(pg_catalog.current_setting('request.headers', true), '')::jsonb;
  v_forwarded_for := NULLIF(
    pg_catalog.btrim(
      pg_catalog.split_part(
        COALESCE(v_headers ->> 'x-forwarded-for', ''),
        ',',
        1
      )
    ),
    ''
  );

  IF v_forwarded_for IS NOT NULL THEN
    BEGIN
      PERFORM v_forwarded_for::inet;
      v_ip_bucket :=
        'question_upvote_ip:' ||
        pg_catalog.md5(p_question_id::text || ':' || v_forwarded_for);
    EXCEPTION WHEN invalid_text_representation THEN
      v_ip_bucket := NULL;
    END;
  END IF;

  v_device_bucket :=
    'question_upvote_device:' ||
    pg_catalog.md5(p_question_id::text || ':' || v_voter_key);

  -- Acquire advisory locks in a stable order so a single IP using multiple
  -- device IDs cannot race the IP counter, and concurrent calls for one
  -- device cannot both observe the same state.
  IF v_ip_bucket IS NOT NULL THEN
    IF v_ip_bucket < v_device_bucket THEN
      PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(v_ip_bucket, 0)
      );
      PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(v_device_bucket, 0)
      );
    ELSE
      PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(v_device_bucket, 0)
      );
      PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(v_ip_bucket, 0)
      );
    END IF;
  ELSE
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(v_device_bucket, 0)
    );
  END IF;

  SELECT pg_catalog.count(*)
    INTO v_count
  FROM public.rate_limit_events AS events
  WHERE events.limit_key = v_device_bucket
    AND events.created_at > pg_catalog.now() - interval '1 hour';

  IF v_count >= 20 THEN
    RETURN pg_catalog.jsonb_build_object('error', 'rate_limited');
  END IF;

  IF v_ip_bucket IS NOT NULL THEN
    SELECT pg_catalog.count(*)
      INTO v_count
    FROM public.rate_limit_events AS events
    WHERE events.limit_key = v_ip_bucket
      AND events.created_at > pg_catalog.now() - interval '1 hour';

    IF v_count >= 20 THEN
      RETURN pg_catalog.jsonb_build_object('error', 'rate_limited');
    END IF;
  END IF;

  INSERT INTO public.rate_limit_events (limit_key)
  SELECT v_device_bucket
  UNION ALL
  SELECT v_ip_bucket
  WHERE v_ip_bucket IS NOT NULL;

  DELETE FROM public.question_upvotes AS upvotes
  WHERE upvotes.question_id = p_question_id
    AND upvotes.voter_key = v_voter_key
  RETURNING upvotes.id INTO v_existing_id;

  IF v_existing_id IS NOT NULL THEN
    RETURN pg_catalog.jsonb_build_object('upvoted', false);
  END IF;

  INSERT INTO public.question_upvotes (question_id, voter_key)
  VALUES (p_question_id, v_voter_key);

  RETURN pg_catalog.jsonb_build_object('upvoted', true);
END;
$function$;

-- The private schema is not exposed by the Data API (see supabase/config.toml).
-- Schema USAGE plus EXECUTE on this one helper lets the SECURITY INVOKER
-- wrapper call it; no other private functions become executable.
GRANT USAGE ON SCHEMA private TO anon, authenticated;

REVOKE ALL ON FUNCTION private.toggle_question_upvote_impl(uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.toggle_question_upvote_impl(uuid, text)
  TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.toggle_question_upvote(
  p_question_id uuid,
  p_voter_key text
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
  SELECT private.toggle_question_upvote_impl(p_question_id, p_voter_key);
$function$;

REVOKE ALL ON FUNCTION public.toggle_question_upvote(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_question_upvote(uuid, text)
  TO anon, authenticated;

-- The base table no longer exposes raw device keys or allows direct writes.
DROP POLICY IF EXISTS upvotes_public_all ON public.question_upvotes;
DROP POLICY IF EXISTS upvotes_public_read ON public.question_upvotes;
DROP POLICY IF EXISTS upvotes_public_insert ON public.question_upvotes;

REVOKE ALL ON TABLE public.question_upvotes
  FROM PUBLIC, anon, authenticated;
