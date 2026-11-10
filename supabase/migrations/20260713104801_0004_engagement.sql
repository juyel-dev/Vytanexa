-- Vytanexa Database Migration
-- Auto-extracted from DATABASE-SCHEMA.md — do not hand-edit divergently;
-- update the source markdown and re-run the extraction script instead.
-- Source of truth: /DATABASE-SCHEMA.md

-- PART 4 — ENGAGEMENT

CREATE TABLE reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     entity_type NOT NULL,     -- 'doctor' | 'hospital'
  entity_id       UUID NOT NULL,
  reviewer_name   TEXT NOT NULL,
  reviewer_phone  TEXT,                     -- for rate-limit dedup, never public
  rating          SMALLINT NOT NULL,
  review_text     TEXT NOT NULL,
  admin_reply     TEXT,
  status          moderation_status NOT NULL DEFAULT 'pending',
  moderated_by    UUID,   -- admin_users(id), Part 5
  moderated_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,

  CONSTRAINT chk_review_entity CHECK (entity_type IN ('doctor','hospital')),
  CONSTRAINT chk_rating_range  CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT chk_review_length CHECK (char_length(review_text) BETWEEN 20 AND 500)
);

CREATE INDEX idx_reviews_entity ON reviews(entity_type, entity_id, status)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_reviews_pending ON reviews(status) WHERE status = 'pending';

CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ★ Rating recalculation trigger — referenced back in Part 2 §2.2 ★
-- Fires on any change affecting an APPROVED review's visibility, keeps
-- doctors.rating_avg / doctors.rating_count (and hospitals' equivalents)
-- in sync automatically. This is the single source of truth mechanism.
CREATE OR REPLACE FUNCTION recalc_entity_rating() RETURNS TRIGGER AS $$
DECLARE
  target_type entity_type;
  target_id   UUID;
  new_avg     NUMERIC(2,1);
  new_count   INT;
BEGIN
  target_type := COALESCE(NEW.entity_type, OLD.entity_type);
  target_id   := COALESCE(NEW.entity_id, OLD.entity_id);

  SELECT ROUND(AVG(rating)::numeric, 1), COUNT(*)
    INTO new_avg, new_count
  FROM reviews
  WHERE entity_type = target_type AND entity_id = target_id
    AND status = 'approved' AND deleted_at IS NULL;

  IF target_type = 'doctor' THEN
    UPDATE doctors SET rating_avg = COALESCE(new_avg, 0),
                        rating_count = COALESCE(new_count, 0)
    WHERE id = target_id;
  ELSIF target_type = 'hospital' THEN
    UPDATE hospitals SET rating_avg = COALESCE(new_avg, 0),
                          rating_count = COALESCE(new_count, 0)
    WHERE id = target_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reviews_recalc_rating
  AFTER INSERT OR UPDATE OF status, rating, deleted_at OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION recalc_entity_rating();

CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id       UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  chamber_id      UUID REFERENCES chambers(id) ON DELETE SET NULL,
  patient_name    TEXT NOT NULL,
  patient_phone   TEXT NOT NULL,
  preferred_time  TEXT,             -- 'any'|'morning'|'afternoon'|'evening'
  message         TEXT,
  source          TEXT NOT NULL DEFAULT 'profile_page',
  status          lead_status NOT NULL DEFAULT 'new',
  contacted_at    TIMESTAMPTZ,
  user_id         UUID,             -- users(id) if signed in, Part 5, nullable (guest OK)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_lead_message CHECK (message IS NULL OR char_length(message) <= 200)
);

CREATE INDEX idx_leads_doctor ON leads(doctor_id, created_at DESC);
CREATE INDEX idx_leads_status ON leads(status) WHERE status = 'new';
CREATE INDEX idx_leads_user   ON leads(user_id) WHERE user_id IS NOT NULL;

CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- Rate limit ("3 per phone per doctor per 24h", S07) enforced via the
-- generic rate_limits mechanism, Part 5 — not duplicated here.

CREATE TABLE questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  body            TEXT,
  category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
  is_anonymous    BOOLEAN NOT NULL DEFAULT false,
  author_name     TEXT,             -- NULL/ignored if is_anonymous
  author_phone    TEXT,             -- private, for moderation contact only
  user_id         UUID,             -- users(id), Part 5, nullable (guest OK)
  upvote_count    INT NOT NULL DEFAULT 0,      -- denormalized, trigger-maintained
  answer_count    INT NOT NULL DEFAULT 0,      -- denormalized, trigger-maintained
  status          moderation_status NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_questions_status   ON questions(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_questions_category ON questions(category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_questions_upvotes  ON questions(upvote_count DESC) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_questions_updated_at BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE question_upvotes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id   UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  voter_key     TEXT NOT NULL,   -- device id (guest) or user_id::text (signed-in)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(question_id, voter_key)  -- one vote per device/user, enforced at DB level
);

CREATE TABLE answers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id     UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  doctor_id       UUID REFERENCES doctors(id) ON DELETE SET NULL,
    -- non-null = verified-doctor answer (✅ badge in S14); NULL = community answer
  author_name     TEXT,
  user_id         UUID,           -- users(id), Part 5
  body            TEXT NOT NULL,
  status          moderation_status NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_answers_question ON answers(question_id) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_answers_updated_at BEFORE UPDATE ON answers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Denormalized counter triggers (upvotes / answers) — same rationale as
-- doctor rating_avg: read constantly on list cards, write rarely.
CREATE OR REPLACE FUNCTION recalc_question_counts() RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'question_upvotes' THEN
    UPDATE questions SET upvote_count = (
      SELECT COUNT(*) FROM question_upvotes
      WHERE question_id = COALESCE(NEW.question_id, OLD.question_id)
    ) WHERE id = COALESCE(NEW.question_id, OLD.question_id);
  ELSIF TG_TABLE_NAME = 'answers' THEN
    UPDATE questions SET answer_count = (
      SELECT COUNT(*) FROM answers
      WHERE question_id = COALESCE(NEW.question_id, OLD.question_id)
        AND status = 'approved' AND deleted_at IS NULL
    ) WHERE id = COALESCE(NEW.question_id, OLD.question_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_upvotes_recalc AFTER INSERT OR DELETE ON question_upvotes
  FOR EACH ROW EXECUTE FUNCTION recalc_question_counts();
CREATE TRIGGER trg_answers_recalc AFTER INSERT OR UPDATE OF status, deleted_at OR DELETE
  ON answers FOR EACH ROW EXECUTE FUNCTION recalc_question_counts();

CREATE TABLE polls (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question      TEXT NOT NULL,
  total_votes   INT NOT NULL DEFAULT 0,   -- denormalized, trigger-maintained
  expires_at    TIMESTAMPTZ,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_by    UUID,     -- admin_users(id), Part 5
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE poll_options (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id       UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_text   TEXT NOT NULL,
  vote_count    INT NOT NULL DEFAULT 0,  -- denormalized, trigger-maintained
  display_order INT NOT NULL DEFAULT 0
);

CREATE TABLE poll_votes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id       UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id     UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  voter_key     TEXT NOT NULL,   -- device id or user_id::text
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(poll_id, voter_key)     -- one vote per device/user per poll, DB-enforced
);

CREATE TRIGGER trg_polls_updated_at BEFORE UPDATE ON polls
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION recalc_poll_counts() RETURNS TRIGGER AS $$
BEGIN
  UPDATE poll_options SET vote_count = (
    SELECT COUNT(*) FROM poll_votes WHERE option_id = poll_options.id
  ) WHERE id = COALESCE(NEW.option_id, OLD.option_id);

  UPDATE polls SET total_votes = (
    SELECT COUNT(*) FROM poll_votes WHERE poll_id = COALESCE(NEW.poll_id, OLD.poll_id)
  ) WHERE id = COALESCE(NEW.poll_id, OLD.poll_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_poll_votes_recalc AFTER INSERT OR DELETE ON poll_votes
  FOR EACH ROW EXECUTE FUNCTION recalc_poll_counts();

CREATE TABLE articles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT NOT NULL UNIQUE,
  title_translations JSONB NOT NULL DEFAULT '{"bn": ""}'::jsonb,
  cover_image_url   TEXT,
  category          TEXT,
  body_html         TEXT NOT NULL,       -- sanitized server-side on write (Admin Panel)
  author_name       TEXT,
  author_doctor_id  UUID REFERENCES doctors(id) ON DELETE SET NULL,
    -- non-null = byline links to doctor profile (S13 spec)
  tags              TEXT[] NOT NULL DEFAULT '{}',
  read_time_minutes INT,
  is_published      BOOLEAN NOT NULL DEFAULT false,
  published_at      TIMESTAMPTZ,
  view_count        INT NOT NULL DEFAULT 0,
  meta_title        TEXT,
  meta_description  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_articles_slug      ON articles(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_articles_published ON articles(published_at DESC)
  WHERE is_published = true AND deleted_at IS NULL;
CREATE INDEX idx_articles_category  ON articles(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_articles_tags      ON articles USING GIN(tags);

CREATE TRIGGER trg_articles_updated_at BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type          notification_type NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  target_url    TEXT,            -- internal route or external URL, nullable
  target_user_id UUID,           -- users(id), Part 5 — REQUIRED if type='personal'
  show_as_banner BOOLEAN NOT NULL DEFAULT false,  -- surfaces in S04 SEC-01
  is_active     BOOLEAN NOT NULL DEFAULT true,
  expires_at    TIMESTAMPTZ,
  created_by    UUID,            -- admin_users(id), Part 5; NULL = system-generated
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_personal_needs_user CHECK (
    type != 'personal' OR target_user_id IS NOT NULL
  )
);

CREATE INDEX idx_notif_active ON notifications(type, is_active)
  WHERE is_active = true;
CREATE INDEX idx_notif_personal ON notifications(target_user_id)
  WHERE type = 'personal';
CREATE INDEX idx_notif_banner  ON notifications(show_as_banner)
  WHERE show_as_banner = true AND is_active = true;

-- Read-state tracking, signed-in users only (guests use localStorage
-- client-side per S20 spec — no DB row needed for anonymous reads)
CREATE TABLE notification_reads (
  user_id         UUID NOT NULL,     -- users(id), Part 5
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  read_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, notification_id)
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;

-- Reviews: public reads APPROVED only; public can INSERT (goes to
-- 'pending'), never UPDATE/DELETE
CREATE POLICY reviews_public_read ON reviews
  FOR SELECT USING (status = 'approved' AND deleted_at IS NULL);
CREATE POLICY reviews_public_insert ON reviews
  FOR INSERT WITH CHECK (status = 'pending');

-- Leads: write-only from public (no public SELECT — a stranger should
-- never read another patient's phone/name via API). Signed-in users
-- read their OWN leads only, via user_id match (S17 history page).
CREATE POLICY leads_public_insert ON leads FOR INSERT WITH CHECK (true);
CREATE POLICY leads_own_read ON leads
  FOR SELECT USING (auth.uid() = user_id);

-- Q&A: same approved-only + insert-as-pending pattern as reviews
CREATE POLICY questions_public_read ON questions
  FOR SELECT USING (status = 'approved' AND deleted_at IS NULL);
CREATE POLICY questions_public_insert ON questions
  FOR INSERT WITH CHECK (status = 'pending');
CREATE POLICY upvotes_public_all ON question_upvotes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY answers_public_read ON answers
  FOR SELECT USING (status = 'approved' AND deleted_at IS NULL);
CREATE POLICY answers_public_insert ON answers
  FOR INSERT WITH CHECK (status = 'pending');

-- Polls: public read active polls + vote once (unique constraint
-- backstops the "one vote" rule even if client logic is bypassed)
CREATE POLICY polls_public_read ON polls
  FOR SELECT USING (is_active = true AND deleted_at IS NULL);
CREATE POLICY poll_options_public_read ON poll_options FOR SELECT USING (true);
CREATE POLICY poll_votes_public_insert ON poll_votes FOR INSERT WITH CHECK (true);
CREATE POLICY poll_votes_no_read ON poll_votes FOR SELECT USING (false);
  -- individual vote rows never exposed; only aggregated vote_count via
  -- poll_options is public — protects voter anonymity

CREATE POLICY articles_public_read ON articles
  FOR SELECT USING (is_published = true AND deleted_at IS NULL);

-- Notifications: general/emergency visible to all; personal only to
-- the owning user
CREATE POLICY notifications_public_read ON notifications
  FOR SELECT USING (
    type IN ('general','emergency') AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  );
CREATE POLICY notifications_personal_read ON notifications
  FOR SELECT USING (type = 'personal' AND target_user_id = auth.uid());
CREATE POLICY notification_reads_own ON notification_reads
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
