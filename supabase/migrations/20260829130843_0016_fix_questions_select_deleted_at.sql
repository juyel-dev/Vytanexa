-- Fixes a real regression introduced by migration 0015: the original
-- questions_public_read policy correctly excluded soft-deleted rows
-- (status = 'approved' AND deleted_at IS NULL), but the consolidated
-- questions_select policy from 0015 dropped the deleted_at check
-- entirely -- meaning a soft-deleted-but-approved question would have
-- incorrectly stayed publicly visible. Caught during post-migration
-- verification, fixed same session rather than left for later.

DROP POLICY questions_select ON questions;
CREATE POLICY questions_select ON questions
  FOR SELECT USING (
    (status = 'approved' AND deleted_at IS NULL) OR (select auth.uid()) = user_id
  );
