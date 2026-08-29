-- get_advisors (performance) flagged two real issues traced to
-- migration 0014's questions_own_read / reviews_own_read policies:
--   1. auth_rls_initplan: auth.uid() re-evaluated per row instead of
--      once per query (should be wrapped as (select auth.uid())).
--   2. multiple_permissive_policies: questions/reviews each had TWO
--      separate permissive SELECT policies (own_read + public_read)
--      for the same role/action -- Postgres evaluates both on every
--      query, which is redundant.
-- Fix: collapse each pair into a single combined policy with an OR,
-- using the wrapped auth.uid() form. Semantically identical to
-- before (approved-to-everyone OR own-row-regardless-of-status),
-- just expressed as one efficient policy instead of two overlapping
-- ones.

DROP POLICY questions_public_read ON questions;
DROP POLICY questions_own_read ON questions;
CREATE POLICY questions_select ON questions
  FOR SELECT USING (status = 'approved' OR (select auth.uid()) = user_id);

DROP POLICY reviews_public_read ON reviews;
DROP POLICY reviews_own_read ON reviews;
CREATE POLICY reviews_select ON reviews
  FOR SELECT USING (
    (status = 'approved' AND deleted_at IS NULL) OR (select auth.uid()) = user_id
  );
