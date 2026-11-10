-- Vytanexa Database Migration
-- Gap found during Phase 2 execution planning (TODO.md): S09 and
-- S04 SEC-09 depend on a symptoms table that was never created in
-- the original schema pass. Applied live via Supabase MCP connector.
-- See DATABASE-SCHEMA.md PART 6 for the documented version.

CREATE TABLE symptoms (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                     TEXT NOT NULL UNIQUE,
  title_translations       JSONB NOT NULL DEFAULT '{"bn": ""}'::jsonb,
  description_translations JSONB NOT NULL DEFAULT '{}'::jsonb,
  cover_image_url          TEXT,
  is_emergency             BOOLEAN NOT NULL DEFAULT false,
  display_order            INT NOT NULL DEFAULT 0,
  is_active                BOOLEAN NOT NULL DEFAULT true,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at                TIMESTAMPTZ
);

CREATE INDEX idx_symptoms_slug      ON symptoms(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_symptoms_emergency ON symptoms(is_emergency)
  WHERE is_emergency = true AND deleted_at IS NULL AND is_active = true;
CREATE INDEX idx_symptoms_active    ON symptoms(display_order)
  WHERE is_active = true AND deleted_at IS NULL;

CREATE TRIGGER trg_symptoms_updated_at BEFORE UPDATE ON symptoms
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE symptom_categories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symptom_id   UUID NOT NULL REFERENCES symptoms(id) ON DELETE CASCADE,
  category_id  UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  display_order INT NOT NULL DEFAULT 0,

  UNIQUE(symptom_id, category_id)
);

CREATE INDEX idx_symptom_categories_symptom  ON symptom_categories(symptom_id);
CREATE INDEX idx_symptom_categories_category ON symptom_categories(category_id);

ALTER TABLE symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptom_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY symptoms_public_read ON symptoms
  FOR SELECT USING (deleted_at IS NULL AND is_active = true);

CREATE POLICY symptom_categories_public_read ON symptom_categories
  FOR SELECT USING (true);
