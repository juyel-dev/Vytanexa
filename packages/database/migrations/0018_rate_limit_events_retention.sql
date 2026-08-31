-- TODO.md Phase 8.5 / DEEPDIVE-REFACTOR-PLAN.md: rate_limit_events had
-- no retention — every check_rate_limit() call inserts a row and
-- nothing ever deleted one, so the table grows forever.
--
-- Deliberately NOT using pg_cron here: this is a free-tier project
-- (per project notes) and pg_cron availability/permissions on this
-- plan haven't been confirmed, so a migration that depends on
-- `CREATE EXTENSION pg_cron` succeeding is a real risk of failing to
-- apply. Instead: piggyback a cheap probabilistic cleanup onto
-- check_rate_limit() itself, which is already called on every
-- rate-limited request — self-contained, no external scheduler, no
-- new extension dependency. random() < 0.01 means roughly 1 in 100
-- calls also runs the delete; at current traffic that's frequent
-- enough to keep the table bounded without adding meaningful latency
-- to the other 99 calls (which skip the DELETE entirely).
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

  IF random() < 0.01 THEN
    DELETE FROM rate_limit_events WHERE created_at < now() - interval '7 days';
  END IF;

  RETURN true;
END;
$function$;
