-- Vytanexa Database Migration
-- Second gap found during Phase 2 execution planning (TODO.md):
-- S04 SEC-02/SEC-07 and ADMIN-PANEL-SPEC.md A12 depend on an ads
-- table that was never created. Applied live via Supabase MCP
-- connector. See DATABASE-SCHEMA.md PART 7 for the documented version.

CREATE TYPE ad_placement AS ENUM ('homepage_banner', 'native_feed');

CREATE TABLE ads (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement      ad_placement NOT NULL,
  sponsor_name   TEXT NOT NULL,
  image_url      TEXT NOT NULL,
  target_url     TEXT NOT NULL,
  display_order  INT NOT NULL DEFAULT 0,
  start_date     DATE NOT NULL,
  end_date       DATE NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ,

  CONSTRAINT chk_ad_date_range CHECK (end_date >= start_date)
);

CREATE INDEX idx_ads_placement_active ON ads(placement, display_order)
  WHERE is_active = true AND deleted_at IS NULL;

CREATE TRIGGER trg_ads_updated_at BEFORE UPDATE ON ads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY ads_public_read ON ads
  FOR SELECT USING (
    deleted_at IS NULL AND is_active = true
    AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE
  );
