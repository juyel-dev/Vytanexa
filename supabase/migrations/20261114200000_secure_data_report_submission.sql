-- Secure user-submitted data corrections behind a validated RPC.
-- Admin moderation continues to read/update through the service role.
CREATE OR REPLACE FUNCTION private.submit_data_report_impl(
  p_entity_type public.entity_type,
  p_entity_id uuid,
  p_reason text,
  p_detail text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_detail text := NULLIF(pg_catalog.btrim(COALESCE(p_detail, '')), '');
  v_rate_key text;
  v_recent_count bigint;
BEGIN
  IF p_entity_type IS NULL OR p_entity_id IS NULL THEN
    RETURN pg_catalog.jsonb_build_object('error', 'invalid_target');
  END IF;

  IF p_reason NOT IN ('wrong_phone', 'wrong_address', 'wrong_hours', 'closed', 'other') THEN
    RETURN pg_catalog.jsonb_build_object('error', 'invalid_reason');
  END IF;

  IF v_detail IS NOT NULL AND pg_catalog.char_length(v_detail) > 1000 THEN
    RETURN pg_catalog.jsonb_build_object('error', 'invalid_detail');
  END IF;

  IF NOT (
    (p_entity_type = 'doctor' AND EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.id = p_entity_id
        AND d.verification_status = 'verified'
        AND d.deleted_at IS NULL
    ))
    OR (p_entity_type = 'hospital' AND EXISTS (
      SELECT 1 FROM public.hospitals h
      WHERE h.id = p_entity_id
        AND h.verification_status = 'verified'
        AND h.deleted_at IS NULL
    ))
    OR (p_entity_type = 'article' AND EXISTS (
      SELECT 1 FROM public.articles a
      WHERE a.id = p_entity_id AND a.is_published = true AND a.deleted_at IS NULL
    ))
    OR (p_entity_type = 'question' AND EXISTS (
      SELECT 1 FROM public.questions q
      WHERE q.id = p_entity_id AND q.status = 'approved' AND q.deleted_at IS NULL
    ))
    OR (p_entity_type = 'poll' AND EXISTS (
      SELECT 1 FROM public.polls p
      WHERE p.id = p_entity_id AND p.is_active = true AND p.deleted_at IS NULL
        AND (p.expires_at IS NULL OR p.expires_at > pg_catalog.now())
    ))
  ) THEN
    RETURN pg_catalog.jsonb_build_object('error', 'invalid_target');
  END IF;

  -- Prevent repeated reports flooding the same entity, even when a caller
  -- bypasses the Next.js route-level IP bucket and calls the RPC directly.
  v_rate_key := 'data_report_entity:' || p_entity_type::text || ':' || p_entity_id::text;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_rate_key, 0));

  SELECT pg_catalog.count(*) INTO v_recent_count
  FROM public.data_reports r
  WHERE r.entity_type = p_entity_type
    AND r.entity_id = p_entity_id
    AND r.created_at > pg_catalog.now() - interval '24 hours';

  IF v_recent_count >= 10 THEN
    RETURN pg_catalog.jsonb_build_object('error', 'rate_limited');
  END IF;

  INSERT INTO public.data_reports (entity_type, entity_id, reason, detail, status)
  VALUES (p_entity_type, p_entity_id, p_reason, v_detail, 'open');

  RETURN pg_catalog.jsonb_build_object('success', true);
END;
$function$;

GRANT USAGE ON SCHEMA private TO anon, authenticated;
REVOKE ALL ON FUNCTION private.submit_data_report_impl(public.entity_type, uuid, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.submit_data_report_impl(public.entity_type, uuid, text, text)
  TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_data_report(
  p_entity_type public.entity_type,
  p_entity_id uuid,
  p_reason text,
  p_detail text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
  SELECT private.submit_data_report_impl(p_entity_type, p_entity_id, p_reason, p_detail);
$function$;

REVOKE ALL ON FUNCTION public.submit_data_report(public.entity_type, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_data_report(public.entity_type, uuid, text, text)
  TO anon, authenticated;

DROP POLICY IF EXISTS data_reports_public_insert ON public.data_reports;
REVOKE ALL ON TABLE public.data_reports FROM PUBLIC, anon, authenticated;
