-- Applied to the live DB via Supabase MCP (blood_donors_register_and_list_rpc).
-- Blood donors: (1) atomic registration, (2) working donor list.
--
-- (1) register_blood_donor: the 90-day per-phone rate-limit slot used to be
--     consumed by the API route BEFORE the INSERT, so any insert failure
--     locked that phone out for 90 days. Here the rate-limit event and the
--     INSERT share one sub-transaction: an exception rolls both back.
--     "already listed" is checked first so it never costs a slot.
-- (2) list_blood_donors: public_blood_donors is security_invoker, while
--     blood_donors has a SELECT policy of USING (false) -> the view returned
--     0 rows to EVERY signed-in user, so the donor list was always empty.
--     A SECURITY DEFINER function (authenticated only, no phone column,
--     newest first) restores it without exposing the table or phone.

CREATE OR REPLACE FUNCTION public.register_blood_donor(
  p_name text, p_phone text, p_blood_group text, p_location_id uuid, p_consent boolean
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN 'unauthenticated'; END IF;
  IF p_consent IS DISTINCT FROM true THEN RETURN 'consent_required'; END IF;
  IF char_length(btrim(coalesce(p_name, ''))) NOT BETWEEN 2 AND 80 THEN RETURN 'invalid_name'; END IF;
  IF p_phone IS NULL OR p_phone !~ '^[6-9][0-9]{9}$' THEN RETURN 'invalid_phone'; END IF;
  IF NOT EXISTS (SELECT 1 FROM locations WHERE id = p_location_id AND type = 'district' AND is_active) THEN
    RETURN 'invalid_location';
  END IF;
  IF EXISTS (SELECT 1 FROM blood_donors WHERE user_id = v_uid AND deleted_at IS NULL) THEN
    RETURN 'already_listed';
  END IF;

  BEGIN
    IF NOT check_rate_limit('donor_register:' || p_phone, 1, interval '90 days') THEN
      RETURN 'rate_limited';
    END IF;
    INSERT INTO blood_donors (name, phone, blood_group, location_id, consent_contact, user_id)
    VALUES (btrim(p_name), p_phone, p_blood_group, p_location_id, true, v_uid);
  EXCEPTION WHEN unique_violation THEN
    RETURN 'already_listed';  -- race with a concurrent registration; slot rolled back too
  END;

  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.register_blood_donor(text, text, text, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_blood_donor(text, text, text, uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_blood_donors(
  p_blood_group text DEFAULT NULL, p_location_id uuid DEFAULT NULL, p_limit integer DEFAULT 30
) RETURNS TABLE (id uuid, name text, blood_group text, location_id uuid, last_donated_at date)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT d.id, d.name, d.blood_group, d.location_id, d.last_donated_at
  FROM blood_donors d
  WHERE auth.uid() IS NOT NULL
    AND d.verification_status = 'verified'
    AND d.deleted_at IS NULL
    AND d.consent_contact = true
    AND (p_blood_group IS NULL OR d.blood_group = p_blood_group)
    AND (p_location_id IS NULL OR d.location_id = p_location_id)
  ORDER BY d.created_at DESC, d.id
  LIMIT least(greatest(coalesce(p_limit, 30), 1), 100);
$$;

REVOKE ALL ON FUNCTION public.list_blood_donors(text, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_blood_donors(text, uuid, integer) TO authenticated;
