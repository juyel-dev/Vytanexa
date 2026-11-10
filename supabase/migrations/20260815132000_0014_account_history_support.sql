-- VYTANEXA-BLUEPRINT.md § S17 "Account Home": "আমার প্রশ্ন ও উত্তর"
-- and "আমার রিভিউ" rows need a signed-in user to see their OWN
-- content regardless of moderation status (a pending question they
-- just submitted should be visible to them, even though
-- questions_public_read only shows approved ones to everyone else).
--
-- questions: add an own-read policy mirroring the already-established
-- leads_own_read pattern (migration 0001/0004) exactly.
CREATE POLICY questions_own_read ON questions
  FOR SELECT USING (auth.uid() = user_id);

-- reviews: has no user_id column at all today, so "My Reviews" is
-- literally unbuildable without a schema change (not an RLS gap like
-- the two above). Additive, nullable column -- doesn't affect the
-- existing anonymous-guest review flow (S07/S08), just lets a
-- signed-in submitter's review be later associated with their account.
ALTER TABLE reviews ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE POLICY reviews_own_read ON reviews
  FOR SELECT USING (auth.uid() = user_id);
