-- Secure public poll voting behind an atomic database operation.
--
-- The browser only supplies a UUID device token for guest deduplication.
-- Authenticated callers are keyed by auth.uid() instead, so changing or
-- clearing localStorage cannot create a second account vote.
--
-- The public API wrapper is SECURITY INVOKER. The internal helper is
-- SECURITY DEFINER so it can insert after direct poll_votes DML is revoked
-- and execute the existing counter trigger in the same transaction.

CREATE OR REPLACE FUNCTION private.submit_poll_vote_impl(
  p_poll_id uuid,
  p_option_id uuid,
  p_voter_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_actor_key text;
  v_rate_key text;
  v_recent_count bigint;
  v_options jsonb;
  v_total_votes integer;
BEGIN
  IF p_poll_id IS NULL OR p_option_id IS NULL THEN
    RETURN pg_catalog.jsonb_build_object('error', 'invalid_vote');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.app_settings AS settings
    WHERE settings.id = 1
      AND settings.features -> 'polls' = 'true'::jsonb
  ) THEN
    RETURN pg_catalog.jsonb_build_object('error', 'feature_disabled');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.polls AS p
    WHERE p.id = p_poll_id
      AND p.is_active = true
      AND p.deleted_at IS NULL
  ) THEN
    RETURN pg_catalog.jsonb_build_object('error', 'poll_unavailable');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.polls AS p
    WHERE p.id = p_poll_id
      AND p.expires_at IS NOT NULL
      AND p.expires_at <= pg_catalog.now()
  ) THEN
    RETURN pg_catalog.jsonb_build_object('error', 'poll_expired');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.poll_options AS o
    WHERE o.id = p_option_id
      AND o.poll_id = p_poll_id
  ) THEN
    RETURN pg_catalog.jsonb_build_object('error', 'invalid_option');
  END IF;

  IF v_user_id IS NOT NULL THEN
    -- Account identity comes from the signed Supabase JWT, never from input.
    v_actor_key := 'user:' || v_user_id::text;
  ELSE
    -- Guest dedup deliberately remains device-level, as specified by S15.
    IF p_voter_key IS NULL
       OR pg_catalog.lower(pg_catalog.btrim(p_voter_key))
          !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RETURN pg_catalog.jsonb_build_object('error', 'invalid_voter_key');
    END IF;
    v_actor_key := 'device:' || pg_catalog.lower(pg_catalog.btrim(p_voter_key));
  END IF;

  -- Store only a hash of the account/device identifier in the rate table.
  -- The unique(poll_id,voter_key) constraint remains the definitive
  -- one-vote-per-poll invariant.
  v_rate_key := 'poll_vote_actor:' || pg_catalog.md5(v_actor_key);

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_rate_key, 0)
  );

  SELECT pg_catalog.count(*)
    INTO v_recent_count
  FROM public.rate_limit_events AS events
  WHERE events.limit_key = v_rate_key
    AND events.created_at > pg_catalog.now() - interval '24 hours';

  IF v_recent_count >= 30 THEN
    RETURN pg_catalog.jsonb_build_object('error', 'rate_limited');
  END IF;

  INSERT INTO public.rate_limit_events (limit_key)
  VALUES (v_rate_key);

  BEGIN
    INSERT INTO public.poll_votes (poll_id, option_id, voter_key)
    VALUES (p_poll_id, p_option_id, v_actor_key);
  EXCEPTION WHEN unique_violation THEN
    RETURN pg_catalog.jsonb_build_object('error', 'already_voted');
  END;

  -- Existing AFTER INSERT trigger has updated option and poll counters in
  -- this transaction. Return exactly the shape consumed by PollsClient.
  SELECT
    COALESCE(
      pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'id', o.id,
          'vote_count', o.vote_count
        )
        ORDER BY o.display_order
      ),
      '[]'::jsonb
    )
  INTO v_options
  FROM public.poll_options AS o
  WHERE o.poll_id = p_poll_id;

  SELECT p.total_votes
    INTO v_total_votes
  FROM public.polls AS p
  WHERE p.id = p_poll_id;

  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'options', v_options,
    'totalVotes', COALESCE(v_total_votes, 0)
  );
END;
$function$;

GRANT USAGE ON SCHEMA private TO anon, authenticated;

REVOKE ALL ON FUNCTION private.submit_poll_vote_impl(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.submit_poll_vote_impl(uuid, uuid, text)
  TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_poll_vote(
  p_poll_id uuid,
  p_option_id uuid,
  p_voter_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
  SELECT private.submit_poll_vote_impl(
    p_poll_id,
    p_option_id,
    p_voter_key
  );
$function$;

REVOKE ALL ON FUNCTION public.submit_poll_vote(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_poll_vote(uuid, uuid, text)
  TO anon, authenticated;

-- Poll vote rows must never be readable or mutable through the public Data
-- API. Aggregated results remain available via poll_options.vote_count and
-- polls.total_votes.
DROP POLICY IF EXISTS poll_votes_public_insert ON public.poll_votes;
REVOKE ALL ON TABLE public.poll_votes
  FROM PUBLIC, anon, authenticated;
