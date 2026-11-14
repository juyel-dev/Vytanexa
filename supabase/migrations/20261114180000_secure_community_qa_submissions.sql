-- Secure community Q&A writes and hide private author metadata.
--
-- Public submission wrappers are SECURITY INVOKER. Their implementations
-- live in the non-exposed private schema and are SECURITY DEFINER so they can
-- write after direct client table DML has been revoked.

CREATE OR REPLACE FUNCTION private.submit_question_impl(
  p_title text,
  p_body text,
  p_category_id uuid,
  p_is_anonymous boolean,
  p_author_name text,
  p_author_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_title text := pg_catalog.btrim(COALESCE(p_title, ''));
  v_body text := NULLIF(pg_catalog.btrim(COALESCE(p_body, '')), '');
  v_is_anonymous boolean := COALESCE(p_is_anonymous, false);
  v_author_name text := NULLIF(pg_catalog.btrim(COALESCE(p_author_name, '')), '');
  v_author_phone text := NULLIF(pg_catalog.btrim(COALESCE(p_author_phone, '')), '');
  v_user_id uuid := auth.uid();
  v_actor_key text;
  v_rate_key text;
  v_recent_count bigint;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.app_settings AS settings
    WHERE settings.id = 1
      AND settings.features -> 'community_qa' = 'true'::jsonb
  ) THEN
    RETURN pg_catalog.jsonb_build_object('error', 'feature_disabled');
  END IF;

  IF pg_catalog.char_length(v_title) NOT BETWEEN 10 AND 200 THEN
    RETURN pg_catalog.jsonb_build_object('error', 'invalid_title');
  END IF;

  IF v_body IS NOT NULL AND pg_catalog.char_length(v_body) > 2000 THEN
    RETURN pg_catalog.jsonb_build_object('error', 'invalid_body');
  END IF;

  IF p_category_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.categories AS c
    WHERE c.id = p_category_id
      AND c.is_active = true
      AND c.deleted_at IS NULL
  ) THEN
    RETURN pg_catalog.jsonb_build_object('error', 'invalid_category');
  END IF;

  IF v_author_name IS NOT NULL AND pg_catalog.char_length(v_author_name) > 80 THEN
    RETURN pg_catalog.jsonb_build_object('error', 'invalid_author_name');
  END IF;

  IF NOT v_is_anonymous AND v_author_name IS NULL THEN
    RETURN pg_catalog.jsonb_build_object('error', 'author_name_required');
  END IF;

  IF v_author_phone IS NOT NULL
     AND (
       pg_catalog.char_length(v_author_phone) > 20
       OR v_author_phone !~ '^[+]?[0-9][0-9 ()-]{5,18}[0-9]$'
     ) THEN
    RETURN pg_catalog.jsonb_build_object('error', 'invalid_author_phone');
  END IF;

  IF v_user_id IS NOT NULL THEN
    v_actor_key := 'user:' || v_user_id::text;
  ELSIF v_author_name IS NOT NULL THEN
    v_actor_key := 'guest_name:' || pg_catalog.md5(pg_catalog.lower(v_author_name));
  ELSE
    -- Anonymous guests have no stable identity in this product flow. This
    -- content hash is a duplicate-content fallback only, not an identity
    -- guarantee. The Next.js Route Handler applies a separate IP bucket.
    v_actor_key := 'guest_content:' ||
      pg_catalog.md5(pg_catalog.lower(v_title || ':' || COALESCE(v_body, '')));
  END IF;

  v_rate_key := 'question_submission:' || pg_catalog.md5(v_actor_key);

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_rate_key, 0)
  );

  SELECT pg_catalog.count(*)
    INTO v_recent_count
  FROM public.rate_limit_events AS events
  WHERE events.limit_key = v_rate_key
    AND events.created_at > pg_catalog.now() - interval '24 hours';

  IF v_recent_count >= 5 THEN
    RETURN pg_catalog.jsonb_build_object('error', 'rate_limited');
  END IF;

  INSERT INTO public.rate_limit_events (limit_key)
  VALUES (v_rate_key);

  INSERT INTO public.questions (
    title,
    body,
    category_id,
    is_anonymous,
    author_name,
    author_phone,
    user_id,
    status
  )
  VALUES (
    v_title,
    v_body,
    p_category_id,
    v_is_anonymous,
    v_author_name,
    v_author_phone,
    v_user_id,
    'pending'::public.moderation_status
  );

  RETURN pg_catalog.jsonb_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION private.submit_answer_impl(
  p_question_id uuid,
  p_body text,
  p_author_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_body text := pg_catalog.btrim(COALESCE(p_body, ''));
  v_author_name text := NULLIF(pg_catalog.btrim(COALESCE(p_author_name, '')), '');
  v_user_id uuid := auth.uid();
  v_actor_key text;
  v_rate_key text;
  v_recent_count bigint;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.app_settings AS settings
    WHERE settings.id = 1
      AND settings.features -> 'community_qa' = 'true'::jsonb
  ) THEN
    RETURN pg_catalog.jsonb_build_object('error', 'feature_disabled');
  END IF;

  IF p_question_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.questions AS q
    WHERE q.id = p_question_id
      AND q.status = 'approved'::public.moderation_status
      AND q.deleted_at IS NULL
  ) THEN
    RETURN pg_catalog.jsonb_build_object('error', 'question_unavailable');
  END IF;

  IF pg_catalog.char_length(v_body) NOT BETWEEN 5 AND 2000 THEN
    RETURN pg_catalog.jsonb_build_object('error', 'invalid_body');
  END IF;

  IF v_author_name IS NOT NULL AND pg_catalog.char_length(v_author_name) > 80 THEN
    RETURN pg_catalog.jsonb_build_object('error', 'invalid_author_name');
  END IF;

  IF v_user_id IS NOT NULL THEN
    v_actor_key := 'user:' || v_user_id::text;
  ELSIF v_author_name IS NOT NULL THEN
    v_actor_key := 'guest_name:' || pg_catalog.md5(pg_catalog.lower(v_author_name));
  ELSE
    -- Anonymous guests can vary their display name/content. This is a
    -- fallback dedup bucket; the Route Handler applies per-IP limiting.
    v_actor_key := 'guest_content:' || pg_catalog.md5(pg_catalog.lower(v_body));
  END IF;

  v_rate_key := 'answer_submission:' || pg_catalog.md5(v_actor_key);

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_rate_key, 0)
  );

  SELECT pg_catalog.count(*)
    INTO v_recent_count
  FROM public.rate_limit_events AS events
  WHERE events.limit_key = v_rate_key
    AND events.created_at > pg_catalog.now() - interval '24 hours';

  IF v_recent_count >= 10 THEN
    RETURN pg_catalog.jsonb_build_object('error', 'rate_limited');
  END IF;

  INSERT INTO public.rate_limit_events (limit_key)
  VALUES (v_rate_key);

  INSERT INTO public.answers (
    question_id,
    doctor_id,
    author_name,
    user_id,
    body,
    status
  )
  VALUES (
    p_question_id,
    NULL,
    v_author_name,
    v_user_id,
    v_body,
    'pending'::public.moderation_status
  );

  RETURN pg_catalog.jsonb_build_object('success', true);
END;
$function$;

-- A private own-question query prevents callers from needing SELECT access to
-- the questions.user_id column.
CREATE OR REPLACE FUNCTION private.list_my_questions_impl()
RETURNS TABLE (
  id uuid,
  title text,
  status public.moderation_status,
  answer_count integer,
  upvote_count integer,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT
    q.id,
    q.title,
    q.status,
    q.answer_count,
    q.upvote_count,
    q.created_at
  FROM public.questions AS q
  WHERE auth.uid() IS NOT NULL
    AND q.user_id = auth.uid()
  ORDER BY q.created_at DESC;
$function$;

GRANT USAGE ON SCHEMA private TO anon, authenticated;

REVOKE ALL ON FUNCTION private.submit_question_impl(text, text, uuid, boolean, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.submit_question_impl(text, text, uuid, boolean, text, text)
  TO anon, authenticated;

REVOKE ALL ON FUNCTION private.submit_answer_impl(uuid, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.submit_answer_impl(uuid, text, text)
  TO anon, authenticated;

REVOKE ALL ON FUNCTION private.list_my_questions_impl()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.list_my_questions_impl()
  TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_question(
  p_title text,
  p_body text,
  p_category_id uuid,
  p_is_anonymous boolean,
  p_author_name text,
  p_author_phone text
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
  SELECT private.submit_question_impl(
    p_title,
    p_body,
    p_category_id,
    p_is_anonymous,
    p_author_name,
    p_author_phone
  );
$function$;

REVOKE ALL ON FUNCTION public.submit_question(text, text, uuid, boolean, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_question(text, text, uuid, boolean, text, text)
  TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_answer(
  p_question_id uuid,
  p_body text,
  p_author_name text
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
  SELECT private.submit_answer_impl(
    p_question_id,
    p_body,
    p_author_name
  );
$function$;

REVOKE ALL ON FUNCTION public.submit_answer(uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_answer(uuid, text, text)
  TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_questions()
RETURNS TABLE (
  id uuid,
  title text,
  status public.moderation_status,
  answer_count integer,
  upvote_count integer,
  created_at timestamptz
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
  SELECT * FROM private.list_my_questions_impl();
$function$;

REVOKE ALL ON FUNCTION public.get_my_questions()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_questions()
  TO authenticated;

-- Only expose columns used by approved public Q&A pages.
DROP POLICY IF EXISTS questions_public_insert ON public.questions;
REVOKE ALL ON TABLE public.questions FROM PUBLIC, anon, authenticated;

GRANT SELECT (
  id,
  title,
  body,
  category_id,
  is_anonymous,
  author_name,
  upvote_count,
  answer_count,
  status,
  created_at
) ON TABLE public.questions TO anon;

GRANT SELECT (
  id,
  title,
  body,
  category_id,
  is_anonymous,
  author_name,
  upvote_count,
  answer_count,
  status,
  created_at
) ON TABLE public.questions TO authenticated;

DROP POLICY IF EXISTS answers_public_insert ON public.answers;
REVOKE ALL ON TABLE public.answers FROM PUBLIC, anon, authenticated;

GRANT SELECT (
  id,
  question_id,
  doctor_id,
  author_name,
  body,
  status,
  created_at
) ON TABLE public.answers TO anon;

GRANT SELECT (
  id,
  question_id,
  doctor_id,
  author_name,
  body,
  status,
  created_at
) ON TABLE public.answers TO authenticated;
