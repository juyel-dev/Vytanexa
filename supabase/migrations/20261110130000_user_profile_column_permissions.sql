-- Narrow end-user profile access to the fields exposed by the account UI.
-- Account creation remains in handle_new_auth_user() (SECURITY DEFINER);
-- account deletion remains in delete_my_account() (SECURITY DEFINER).
-- Users cannot self-edit verified phone, guest-conversion state or lifecycle
-- fields such as deleted_at.

DROP POLICY IF EXISTS users_own_read_write ON public.users;

CREATE POLICY users_own_select
  ON public.users
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

CREATE POLICY users_own_profile_update
  ON public.users
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

REVOKE ALL ON TABLE public.users FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.users TO authenticated;

GRANT UPDATE (
  name,
  email,
  preferred_language,
  default_location_id,
  notification_prefs
) ON TABLE public.users TO authenticated;
