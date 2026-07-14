-- Vytanexa Database Migration
-- Applied live via Supabase MCP connector after running the built-in
-- security/performance advisors against the freshly migrated schema
-- (0001-0005). Saved here for repo/live-DB parity — see
-- PROJECT-CONTEXT.md and IMPLEMENTATION-ROADMAP.md Phase 1 for context.

-- ═══════════════════════════════════════════════════════════════
-- Vytanexa — Security & Performance Hardening
-- Some advisor findings are BY-DESIGN and intentionally left as-is
-- (documented inline below).
-- ═══════════════════════════════════════════════════════════════

-- ── FIX 1: Views were running as SECURITY DEFINER (ERROR level) ──
-- Views should run as the QUERYING user (respecting their RLS), not
-- as the view creator. Recreate all 3 public views with
-- security_invoker = true (Postgres 15+ / this project is PG 17).
CREATE OR REPLACE VIEW location_paths
WITH (security_invoker = true) AS
WITH RECURSIVE path AS (
  SELECT id, parent_id, type, name_translations, slug,
         ARRAY[id] AS path_ids, 1 AS depth
  FROM locations WHERE parent_id IS NULL AND deleted_at IS NULL
  UNION ALL
  SELECT l.id, l.parent_id, l.type, l.name_translations, l.slug,
         p.path_ids || l.id, p.depth + 1
  FROM locations l
  JOIN path p ON l.parent_id = p.id
  WHERE l.deleted_at IS NULL
)
SELECT * FROM path;

CREATE OR REPLACE VIEW public_entity_tiers
WITH (security_invoker = true) AS
  SELECT s.entity_type, s.entity_id, p.tier
  FROM subscriptions s
  JOIN subscription_plans p ON p.id = s.plan_id
  WHERE s.status = 'active' AND (s.expires_at IS NULL OR s.expires_at > now());

CREATE OR REPLACE VIEW public_blood_donors
WITH (security_invoker = true) AS
  SELECT id, name, blood_group, location_id, last_donated_at
  FROM blood_donors
  WHERE is_active = true AND deleted_at IS NULL AND consent_contact = true;

-- ── FIX 2: Functions had mutable search_path (WARN) ──────────────
ALTER FUNCTION set_updated_at() SET search_path = public;
ALTER FUNCTION recalc_entity_rating() SET search_path = public;
ALTER FUNCTION recalc_question_counts() SET search_path = public;
ALTER FUNCTION recalc_poll_counts() SET search_path = public;
ALTER FUNCTION handle_new_auth_user() SET search_path = public;
ALTER FUNCTION is_admin() SET search_path = public;
ALTER FUNCTION check_rate_limit(TEXT, INT, INTERVAL) SET search_path = public;

-- ── FIX 3: question_upvotes had FOR ALL USING(true) (real gap) ───
-- The original policy allowed ANYONE to UPDATE/DELETE ANY vote row.
-- Split into precise per-action policies: insert your vote, read
-- counts (fine, no PII), no arbitrary update/delete via public API.
DROP POLICY IF EXISTS upvotes_public_all ON question_upvotes;
CREATE POLICY upvotes_public_insert ON question_upvotes
  FOR INSERT WITH CHECK (true);
CREATE POLICY upvotes_public_read ON question_upvotes
  FOR SELECT USING (true);

-- ── FIX 4: handle_new_auth_user was callable directly via RPC ────
REVOKE EXECUTE ON FUNCTION handle_new_auth_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION is_admin() FROM anon;

-- ── FIX 5: auth.uid() re-evaluated per-row in RLS (performance) ──
DROP POLICY IF EXISTS leads_own_read ON leads;
CREATE POLICY leads_own_read ON leads
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS notifications_personal_read ON notifications;
DROP POLICY IF EXISTS notifications_public_read ON notifications;
CREATE POLICY notifications_read ON notifications
  FOR SELECT USING (
    (type IN ('general','emergency') AND is_active = true
      AND (expires_at IS NULL OR expires_at > now()))
    OR (type = 'personal' AND target_user_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS notification_reads_own ON notification_reads;
CREATE POLICY notification_reads_own ON notification_reads
  FOR ALL USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS users_own_read_write ON users;
CREATE POLICY users_own_read_write ON users
  FOR ALL USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS favorites_own_all ON user_favorites;
CREATE POLICY favorites_own_all ON user_favorites
  FOR ALL USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS admin_users_own_read ON admin_users;
CREATE POLICY admin_users_own_read ON admin_users
  FOR SELECT USING ((select auth.uid()) = id);

-- ── FIX 6: Missing indexes on frequently-joined foreign keys ─────
CREATE INDEX idx_leads_chamber ON leads(chamber_id) WHERE chamber_id IS NOT NULL;
CREATE INDEX idx_subs_plan ON subscriptions(plan_id);
CREATE INDEX idx_users_location ON users(default_location_id) WHERE default_location_id IS NOT NULL;
CREATE INDEX idx_poll_options_poll ON poll_options(poll_id);
CREATE INDEX idx_poll_votes_option ON poll_votes(option_id);
CREATE INDEX idx_notif_reads_notification ON notification_reads(notification_id);
CREATE INDEX idx_ambulance_hospital ON ambulance_services(hospital_id) WHERE hospital_id IS NOT NULL;
CREATE INDEX idx_analytics_location ON analytics_events(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX idx_answers_doctor ON answers(doctor_id) WHERE doctor_id IS NOT NULL;
CREATE INDEX idx_articles_author_doctor ON articles(author_doctor_id) WHERE author_doctor_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════
-- INTENTIONALLY NOT CHANGED (advisor findings reviewed, no action):
--
-- • rls_enabled_no_policy on audit_logs, rate_limit_events,
--   subscriptions — BY DESIGN (service-role-only access, INFO level).
--
-- • rls_policy_always_true on analytics_events, data_reports, leads,
--   page_submissions, poll_votes — BY DESIGN write-only insert
--   endpoints with no matching public SELECT policy.
--
-- • extension_in_public (pg_trgm, unaccent) — DEFERRED. Moving would
--   require dropping/rebuilding trigram indexes already dependent on
--   them. WARN severity, low real-world risk in a single-schema
--   project. Revisit if a stricter security posture is ever required.
--
-- • unused_index findings — expected on a freshly migrated, empty
--   database. Re-run get_advisors after real usage data accumulates.
-- ═══════════════════════════════════════════════════════════════
