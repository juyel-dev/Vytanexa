-- Reviews are submitted through a guarded RPC; public table reads expose
-- only the columns required to render approved reviews. Sensitive reviewer and
-- moderation metadata stays unavailable to anon/authenticated roles.
--
-- Public wrappers are SECURITY INVOKER. Privileged writes and own-review
-- lookup live in the non-exposed private schema.

CREATE OR REPLACE FUNCTION private.submit_review_impl(
  p_entity_type public.entity_type,
  p_entity_id uuid,
  p_reviewer_name text,
  p_rating integer,
  p_review_text text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_reviewer_name text := pg_catalog.btrim(COALESCE(p_reviewer_name, ''));
  v_review_text text := pg_catalog.btrim(COALESCE(p_review_text, ''));
  v_user_id uuid := auth.uid();
  v_actor_key text;
  v_rate_key text;
  v_recent_count bigint;
BEGIN
  IF p_entity_type IS NULL
     OR p_entity_type NOT IN (
       'doctor'::public.entity_type,
       'hospital'::public.entity_type
     )
     OR p_entity_id IS NULL THEN
    RETURN pg_catalog.jsonb_build_object('error', 'invalid_entity');
  END IF;

  IF pg_catalog.char_length(v_reviewer_name) NOT BETWEEN 2 AND 80 THEN
    RETURN pg_catalog.jsonb_build_object('error', 'invalid_name');
  END IF;

  IF p_rating IS NULL OR p_rating NOT BETWEEN 1 AND 5 THEN
    RETURN pg_catalog.jsonb_build_object('error', 'invalid_rating');
  END IF;

  IF pg_catalog.char_length(v_review_text) NOT BETWEEN 20 AND 500 THEN
    RETURN pg_catalog.jsonb_build_object('error', 'invalid_review_text');
  END IF;

  IF p_entity_type = 'doctor'::public.entity_type THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.doctors AS d
      WHERE d.id = p_entity_id
        AND d.verification_status = 'verified'::public.verification_status
        AND d.deleted_at IS NULL
    ) THEN
      RETURN pg_catalog.jsonb_build_object('error', 'entity_unavailable');
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1
      FROM public.hospitals AS h
      WHERE h.id = p_entity_id
        AND h.verification_status = 'verified'::public.verification_status
        AND h.deleted_at IS NULL
    ) THEN
      RETURN pg_catalog.jsonb_build_object('error', 'entity_unavailable');
    END IF;
  END IF;

  -- Authenticated users are limited by immutable account ID. Guests use a
  -- normalized display-name bucket as a database-side fallback; the
  -- Route Handler separately applies the stronger per-IP limit.
  IF v_user_id IS NOT NULL THEN
    v_actor_key := 'user:' || v_user_id::text;
  ELSE
    v_actor_key := 'guest:' || pg_catalog.md5(pg_catalog.lower(v_reviewer_name));
  END IF;

  v_rate_key :=
    'review_submission:' ||
    pg_catalog.md5(p_entity_type::text || ':' || p_entity_id::text || ':' || v_actor_key);

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

  INSERT INTO public.reviews (
    entity_type,
    entity_id,
    reviewer_name,
    reviewer_phone,
    rating,
    review_text,
    admin_reply,
    status,
    moderated_by,
    moderated_at,
    user_id
  )
  VALUES (
    p_entity_type,
    p_entity_id,
    v_reviewer_name,
    NULL,
    p_rating::smallint,
    v_review_text,
    NULL,
    'pending'::public.moderation_status,
    NULL,
    NULL,
    v_user_id
  );

  RETURN pg_catalog.jsonb_build_object('success', true);
END;
$function$;

GRANT USAGE ON SCHEMA private TO anon, authenticated;

REVOKE ALL ON FUNCTION private.submit_review_impl(public.entity_type, uuid, text, integer, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.submit_review_impl(public.entity_type, uuid, text, integer, text)
  TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_review(
  p_entity_type public.entity_type,
  p_entity_id uuid,
  p_reviewer_name text,
  p_rating integer,
  p_review_text text
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
  SELECT private.submit_review_impl(
    p_entity_type,
    p_entity_id,
    p_reviewer_name,
    p_rating,
    p_review_text
  );
$function$;

REVOKE ALL ON FUNCTION public.submit_review(public.entity_type, uuid, text, integer, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_review(public.entity_type, uuid, text, integer, text)
  TO anon, authenticated;

-- An own-review query must not need to read the user_id column from the
-- public reviews table. This helper returns only the caller's own safe fields.
CREATE OR REPLACE FUNCTION private.list_my_reviews_impl()
RETURNS TABLE (
  id uuid,
  entity_type public.entity_type,
  entity_id uuid,
  rating smallint,
  review_text text,
  status public.moderation_status,
  admin_reply text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT
    r.id,
    r.entity_type,
    r.entity_id,
    r.rating,
    r.review_text,
    r.status,
    r.admin_reply,
    r.created_at
  FROM public.reviews AS r
  WHERE auth.uid() IS NOT NULL
    AND r.user_id = auth.uid()
  ORDER BY r.created_at DESC;
$function$;

REVOKE ALL ON FUNCTION private.list_my_reviews_impl()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.list_my_reviews_impl()
  TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_reviews()
RETURNS TABLE (
  id uuid,
  entity_type public.entity_type,
  entity_id uuid,
  rating smallint,
  review_text text,
  status public.moderation_status,
  admin_reply text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
  SELECT * FROM private.list_my_reviews_impl();
$function$;

REVOKE ALL ON FUNCTION public.get_my_reviews()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_reviews()
  TO authenticated;

-- Remove direct mutation and table-wide SELECT. Public/authorized clients get
-- only fields used to render approved reviews and the status filter. The
-- account history query uses get_my_reviews() so user_id never needs a grant.
DROP POLICY IF EXISTS reviews_public_insert ON public.reviews;

REVOKE ALL ON TABLE public.reviews FROM PUBLIC, anon, authenticated;

GRANT SELECT (
  id,
  entity_type,
  entity_id,
  reviewer_name,
  rating,
  review_text,
  admin_reply,
  status,
  created_at
) ON TABLE public.reviews TO anon;

GRANT SELECT (
  id,
  entity_type,
  entity_id,
  reviewer_name,
  rating,
  review_text,
  admin_reply,
  status,
  created_at
) ON TABLE public.reviews TO authenticated;
