-- Fixes rate limit check failing for anon due to RLS on rate_limit_events.
-- The function was SECURITY INVOKER (default) so anon's INSERT into
-- rate_limit_events was blocked by RLS (ZERO policies, fully locked).
-- Making it SECURITY DEFINER lets anon call it with elevated privileges
-- to record the rate limit event, matching DATABASE-SCHEMA.md Part 5
-- comment: "Written exclusively by server-side (service role /
-- SECURITY DEFINER functions). No policy for anon/authenticated =
-- fully locked."
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key text, p_max_count integer, p_window interval)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_count INT;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM rate_limit_events
  WHERE limit_key = p_key AND created_at > now() - p_window;

  IF current_count >= p_max_count THEN
    RETURN false;
  END IF;

  INSERT INTO rate_limit_events(limit_key) VALUES (p_key);
  RETURN true;
END;
$function$;
