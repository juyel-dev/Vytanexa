-- Applied to the live DB via Supabase MCP (delete_my_account_rpc).
-- Account deletion that actually deletes (spec § S17, DPDP-style erasure).
--
-- The old route only blanked name/email/phone on public.users and set
-- deleted_at: the auth user stayed (so the person could sign straight back
-- in), and their blood-donor listing WITH PHONE stayed public, plus author
-- name/phone on questions, names on answers/reviews, favorites, analytics
-- user_id. The schema is already built for a real delete: public.users
-- cascades from auth.users; user_favorites / notification_reads / personal
-- notifications cascade from public.users; questions/answers/reviews/leads
-- are SET NULL. This function scrubs the PII those SET NULL FKs would orphan,
-- then deletes the auth user, in ONE transaction (any failure rolls back
-- everything). Leads are kept (patient name/phone is the provider's record
-- of a request) but are unlinked from the account.

CREATE OR REPLACE FUNCTION public.delete_my_account() RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN 'unauthenticated'; END IF;
  -- Guard: admin_users cascades from auth.users — never let a self-service
  -- button silently remove an admin's access.
  IF EXISTS (SELECT 1 FROM admin_users WHERE id = v_uid) THEN RETURN 'admin_account'; END IF;

  DELETE FROM blood_donors WHERE user_id = v_uid;
  UPDATE questions SET author_name = NULL, author_phone = NULL, is_anonymous = true WHERE user_id = v_uid;
  UPDATE answers SET author_name = NULL WHERE user_id = v_uid;
  UPDATE reviews SET reviewer_name = 'একজন ব্যবহারকারী', reviewer_phone = NULL WHERE user_id = v_uid;
  UPDATE analytics_events SET user_id = NULL WHERE user_id = v_uid;

  DELETE FROM auth.users WHERE id = v_uid;
  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
