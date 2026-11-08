-- Web Push subscriptions (PWA). NOT yet applied to the live DB — run in the
-- Supabase SQL editor (or via the Supabase MCP) before enabling push.
--
-- Anonymous devices may subscribe (emergency alerts must reach people who
-- never signed in); signed-in devices are linked to their user so
-- `personal` notifications can be pushed to the right person.
--
-- RLS is enabled with NO policies: browsers never touch the table directly.
-- Writes go through the SECURITY DEFINER functions below; the admin panel
-- (service role) reads it to send pushes and prunes dead endpoints.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint      text NOT NULL UNIQUE CHECK (char_length(endpoint) BETWEEN 20 AND 2048 AND endpoint LIKE 'https://%'),
  p256dh        text NOT NULL CHECK (char_length(p256dh) BETWEEN 20 AND 256),
  auth          text NOT NULL CHECK (char_length(auth) BETWEEN 8 AND 128),
  -- Cascade: deleting the account (delete_my_account) removes its devices.
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  locale        text CHECK (locale IN ('bn', 'en', 'hi')),
  user_agent    text CHECK (char_length(user_agent) <= 300),
  failed_count  integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_last_seen ON public.push_subscriptions(last_seen_at);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_subscriptions FROM anon, authenticated;

-- Register / refresh this device. Idempotent per endpoint. The linked user
-- is ALWAYS the current auth.uid() (NULL when signed out), so after sign-out
-- the device stops receiving the previous user's personal notifications.
CREATE OR REPLACE FUNCTION public.register_push_subscription(
  p_endpoint text, p_p256dh text, p_auth text,
  p_locale text DEFAULT NULL, p_user_agent text DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_endpoint IS NULL OR p_endpoint !~ '^https://' OR char_length(p_endpoint) NOT BETWEEN 20 AND 2048 THEN
    RETURN 'invalid_endpoint';
  END IF;
  IF p_p256dh IS NULL OR char_length(p_p256dh) NOT BETWEEN 20 AND 256
     OR p_auth IS NULL OR char_length(p_auth) NOT BETWEEN 8 AND 128 THEN
    RETURN 'invalid_keys';
  END IF;
  -- Abuse guard: one device refreshes at most 20x/hour.
  IF NOT check_rate_limit('push_sub:' || md5(p_endpoint), 20, interval '1 hour') THEN
    RETURN 'rate_limited';
  END IF;

  INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_id, locale, user_agent)
  VALUES (p_endpoint, p_p256dh, p_auth, auth.uid(),
          CASE WHEN p_locale IN ('bn', 'en', 'hi') THEN p_locale END,
          left(p_user_agent, 300))
  ON CONFLICT (endpoint) DO UPDATE
    SET p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        user_id = auth.uid(),
        locale = coalesce(EXCLUDED.locale, push_subscriptions.locale),
        user_agent = coalesce(EXCLUDED.user_agent, push_subscriptions.user_agent),
        failed_count = 0,
        last_seen_at = now();
  RETURN 'ok';
END;
$$;

CREATE OR REPLACE FUNCTION public.unregister_push_subscription(p_endpoint text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM push_subscriptions WHERE endpoint = p_endpoint;
  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.register_push_subscription(text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.unregister_push_subscription(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_push_subscription(text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unregister_push_subscription(text) TO anon, authenticated;

-- Retention: subscriptions not refreshed for 180 days belong to abandoned
-- devices. Call from the existing retention job (see 0018) or manually.
CREATE OR REPLACE FUNCTION public.prune_push_subscriptions() RETURNS integer
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH d AS (DELETE FROM push_subscriptions WHERE last_seen_at < now() - interval '180 days' RETURNING 1)
  SELECT count(*)::int FROM d;
$$;
REVOKE ALL ON FUNCTION public.prune_push_subscriptions() FROM PUBLIC, anon, authenticated;
