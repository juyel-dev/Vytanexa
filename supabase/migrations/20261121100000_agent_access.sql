-- Agent (MCP) access for admin moderation.
--
-- Adds:
--   * audit_logs.actor_type / agent_token_id so agent actions are
--     distinguishable from human admin actions.
--   * agent_tokens: hashed, scoped, revocable bearer tokens (the raw token is
--     never stored).
--   * agent_usage + agent_consume_quota(): atomic per-token daily action cap.
--
-- Everything here is service-role only. No policy is created for anon or
-- authenticated, and table/function privileges are revoked from them.

-- ---------------------------------------------------------------------------
-- agent_tokens
-- ---------------------------------------------------------------------------
CREATE TABLE public.agent_tokens (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  token_hash        text NOT NULL UNIQUE,   -- sha256 hex of the raw token
  scopes            text[] NOT NULL DEFAULT ARRAY['read']::text[],
  daily_action_cap  integer NOT NULL DEFAULT 200,
  is_active         boolean NOT NULL DEFAULT true,
  created_by        uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  last_used_at      timestamptz,
  expires_at        timestamptz,
  revoked_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_agent_token_name  CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  CONSTRAINT chk_agent_token_scopes CHECK (
    cardinality(scopes) >= 1 AND scopes <@ ARRAY['read', 'moderate']::text[]
  ),
  CONSTRAINT chk_agent_token_cap CHECK (daily_action_cap BETWEEN 1 AND 5000)
);

ALTER TABLE public.agent_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.agent_tokens FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- agent_usage (daily action counter, one row per token per UTC day)
-- ---------------------------------------------------------------------------
CREATE TABLE public.agent_usage (
  token_id  uuid NOT NULL REFERENCES public.agent_tokens(id) ON DELETE CASCADE,
  day       date NOT NULL,
  actions   integer NOT NULL DEFAULT 0,
  PRIMARY KEY (token_id, day)
);

ALTER TABLE public.agent_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.agent_usage FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- audit_logs: who acted
-- ---------------------------------------------------------------------------
ALTER TABLE public.audit_logs
  ADD COLUMN actor_type text NOT NULL DEFAULT 'human',
  ADD COLUMN agent_token_id uuid REFERENCES public.agent_tokens(id) ON DELETE SET NULL;

ALTER TABLE public.audit_logs
  ADD CONSTRAINT chk_audit_actor_type CHECK (actor_type IN ('human', 'agent'));

CREATE INDEX idx_audit_agent
  ON public.audit_logs (created_at DESC)
  WHERE actor_type = 'agent';

-- ---------------------------------------------------------------------------
-- Atomic daily quota. Returns true if p_amount fits under p_cap for today
-- (UTC) and records it; false otherwise (nothing is recorded).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.agent_consume_quota(
  p_token_id uuid,
  p_amount   integer,
  p_cap      integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_day     date := (pg_catalog.now() AT TIME ZONE 'UTC')::date;
  v_actions integer;
BEGIN
  IF p_token_id IS NULL
     OR p_amount IS NULL OR p_amount < 1
     OR p_cap IS NULL OR p_cap < 1
     OR p_amount > p_cap THEN
    RETURN false;
  END IF;

  INSERT INTO public.agent_usage AS u (token_id, day, actions)
  VALUES (p_token_id, v_day, p_amount)
  ON CONFLICT (token_id, day) DO UPDATE
    SET actions = u.actions + EXCLUDED.actions
    WHERE u.actions + EXCLUDED.actions <= p_cap
  RETURNING u.actions INTO v_actions;

  RETURN v_actions IS NOT NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.agent_consume_quota(uuid, integer, integer)
  FROM PUBLIC, anon, authenticated;
