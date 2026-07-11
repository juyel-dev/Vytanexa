-- Vytanexa Database Migration
-- Auto-extracted from DATABASE-SCHEMA.md — do not hand-edit divergently;
-- update the source markdown and re-run the extraction script instead.
-- Source of truth: /DATABASE-SCHEMA.md

-- PART 5 — SYSTEM (Final Part)

CREATE TABLE users (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name                TEXT,
  phone               TEXT UNIQUE,
  email               TEXT,
  preferred_language  TEXT NOT NULL DEFAULT 'bn',
  default_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  notification_prefs  JSONB NOT NULL DEFAULT '{
    "general": true, "emergency": true, "articles": true
  }'::jsonb,
    -- "emergency" is UI-locked true in S18 (non-togglable) but stored
    -- here for schema completeness / future flexibility if that
    -- product decision ever changes
  is_guest_converted  BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ   -- soft delete = S17 "account deletion"
);

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-create a `users` row whenever Supabase Auth creates an
-- `auth.users` row (phone/Google sign-up) — keeps the two tables
-- always in sync without app-layer glue code remembering to do it.
CREATE OR REPLACE FUNCTION handle_new_auth_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, phone, email)
  VALUES (NEW.id, NEW.phone, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

CREATE TABLE user_favorites (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type  entity_type NOT NULL,   -- 'doctor' | 'hospital'
  entity_id    UUID NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_fav_entity CHECK (entity_type IN ('doctor','hospital')),
  UNIQUE(user_id, entity_type, entity_id)
);

CREATE INDEX idx_favorites_user ON user_favorites(user_id);

CREATE TABLE admin_users (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  role         app_role NOT NULL DEFAULT 'editor',
  permissions  JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- fine-grained overrides beyond role defaults, e.g.
    -- { "can_edit_theme": true, "can_manage_admins": false }
    -- Full permission matrix defined in the Admin Panel spec.
  is_active    BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_admin_users_updated_at BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Helper used inside RLS policies to check "is this session an admin"
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE id = auth.uid() AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE TABLE data_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   entity_type NOT NULL,
  entity_id     UUID NOT NULL,
  reason        TEXT NOT NULL,   -- 'wrong_phone'|'wrong_address'|'wrong_hours'|'closed'|'other'
  detail        TEXT,
  reporter_ip   INET,
  status        TEXT NOT NULL DEFAULT 'open',  -- 'open'|'resolved'|'dismissed'
  resolved_by   UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_report_status CHECK (status IN ('open','resolved','dismissed'))
);

CREATE INDEX idx_data_reports_open ON data_reports(status) WHERE status = 'open';
CREATE INDEX idx_data_reports_entity ON data_reports(entity_type, entity_id);

CREATE TABLE analytics_events (
  id            BIGSERIAL PRIMARY KEY,   -- BIGSERIAL not UUID: high write
                                          -- volume table, sequential int
                                          -- is cheaper to index than UUID
  event_type    TEXT NOT NULL,
    -- 'doctor_view','call_click','whatsapp_click','lead_submit','share',
    -- 'review_submit','search','search_select','article_view',
    -- 'poll_vote','emergency_call_click', etc. — open-ended by design
  entity_type   TEXT,
  entity_id     UUID,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- event-specific extra fields, e.g. { "method": "whatsapp" } for
    -- share events, { "query": "...", "result_count": 5 } for search
  location_id   UUID REFERENCES locations(id) ON DELETE SET NULL,
  device_type   TEXT,
  session_id    TEXT,
  user_id       UUID,   -- nullable, set if signed in
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partitioned by month for long-term scale (5-year horizon = this
-- table will be the single largest in the database by an order of
-- magnitude; partitioning keeps queries and vacuum fast as it grows)
-- Actual partition creation is an operational/migration-script concern,
-- noted here as the intended strategy:
--   CREATE TABLE analytics_events_YYYY_MM PARTITION OF analytics_events
--   FOR VALUES FROM ('YYYY-MM-01') TO ('YYYY-MM+1-01');

CREATE INDEX idx_analytics_type       ON analytics_events(event_type, created_at DESC);
CREATE INDEX idx_analytics_entity     ON analytics_events(entity_type, entity_id);
CREATE INDEX idx_analytics_created    ON analytics_events(created_at DESC);

CREATE TABLE audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  admin_id    UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,        -- 'create'|'update'|'delete'|'restore'|'publish'
  entity_type TEXT NOT NULL,        -- table/domain name, e.g. 'doctor','app_settings'
  entity_id   TEXT,                 -- nullable for singleton settings edits
  before_data JSONB,
  after_data  JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_admin  ON audit_logs(admin_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);

-- Written by the Admin Panel's server-side mutation layer (every
-- write route wraps its Supabase call with an audit_logs insert) —
-- not a DB trigger, because we need the before/after diff and the
-- acting admin_id, which are cleanest to capture at the application
-- layer where the request context is already available.

CREATE TABLE rate_limit_events (
  id          BIGSERIAL PRIMARY KEY,
  limit_key   TEXT NOT NULL,   -- e.g. 'lead:9876543210:doctor:<uuid>'
                                --      'review:1.2.3.4:doctor:<uuid>'
                                --      'donor_register:9876543210'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rate_limit_key_time ON rate_limit_events(limit_key, created_at DESC);

-- Reusable check function — call before any rate-limited insert:
--   SELECT check_rate_limit('lead:9876543210:doctor:<uuid>', 3, interval '24 hours');
-- Returns TRUE if the action is allowed (records the event as a side
-- effect), FALSE if the limit is already hit.
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT, p_max_count INT, p_window INTERVAL
) RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql;

-- Old rows beyond any realistic window are periodically purged via a
-- scheduled job (pg_cron or Supabase Edge Function cron) — operational
-- concern, not a schema concern; noted for completeness.

ALTER TABLE leads               ADD CONSTRAINT fk_leads_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE questions           ADD CONSTRAINT fk_questions_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE answers             ADD CONSTRAINT fk_answers_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE notification_reads  ADD CONSTRAINT fk_notif_reads_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notifications       ADD CONSTRAINT fk_notif_target_user
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notifications       ADD CONSTRAINT fk_notif_created_by
  FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL;
ALTER TABLE reviews             ADD CONSTRAINT fk_reviews_moderated_by
  FOREIGN KEY (moderated_by) REFERENCES admin_users(id) ON DELETE SET NULL;
ALTER TABLE custom_pages        ADD CONSTRAINT fk_pages_created_by
  FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL;
ALTER TABLE app_settings        ADD CONSTRAINT fk_settings_updated_by
  FOREIGN KEY (updated_by) REFERENCES admin_users(id) ON DELETE SET NULL;
ALTER TABLE polls               ADD CONSTRAINT fk_polls_created_by
  FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_own_read_write ON users
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY favorites_own_all ON user_favorites
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- admin_users: an admin can read their own row (for permission checks
-- client-side); full admin roster management is service-role only
CREATE POLICY admin_users_own_read ON admin_users
  FOR SELECT USING (auth.uid() = id);

-- data_reports: public insert-only (matches leads pattern — a data
-- correction report is a one-way write, no read-back needed)
CREATE POLICY data_reports_public_insert ON data_reports
  FOR INSERT WITH CHECK (true);

-- analytics_events: public insert-only (client fires events), no
-- public read whatsoever — this is business intelligence data
CREATE POLICY analytics_public_insert ON analytics_events
  FOR INSERT WITH CHECK (true);

-- audit_logs, rate_limit_events: ZERO public access, either direction.
-- Written exclusively by server-side (service role / SECURITY DEFINER
-- functions). No policy for anon/authenticated = fully locked.
