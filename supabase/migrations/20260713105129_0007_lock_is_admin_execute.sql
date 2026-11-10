-- Vytanexa Database Migration
-- Applied live via Supabase MCP connector. Saved here for repo/live-DB
-- parity — see IMPLEMENTATION-ROADMAP.md Phase 1.

-- is_admin() was still anon-callable after 0006's targeted REVOKE
-- because EXECUTE was originally granted to the PUBLIC pseudo-role at
-- creation, which anon inherits regardless of a REVOKE FROM anon
-- specifically. Revoke from PUBLIC explicitly, then grant back only
-- to the role that legitimately needs it (signed-in admin-panel
-- sessions checking their own admin status).
REVOKE EXECUTE ON FUNCTION is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
