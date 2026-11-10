-- Vytanexa Database Migration
-- Auto-extracted from DATABASE-SCHEMA.md — do not hand-edit divergently;
-- update the source markdown and re-run the extraction script instead.
-- Source of truth: /DATABASE-SCHEMA.md

-- PART 1 — CORE

CREATE EXTENSION IF NOT EXISTS "pgcrypto";     -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- fuzzy/ILIKE search speed
CREATE EXTENSION IF NOT EXISTS "unaccent";     -- search normalization

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Attached to every table below via:
--   CREATE TRIGGER trg_<table>_updated_at BEFORE UPDATE ON <table>
--   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- (repeated per-table in each PART, omitted from prose after Part 1 for brevity)

CREATE TYPE location_type AS ENUM ('state', 'district', 'sub_district', 'ward');

CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected', 'suspended');

CREATE TYPE entity_type AS ENUM ('doctor', 'hospital', 'article', 'question', 'poll');

CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'completed', 'cancelled', 'spam');

CREATE TYPE subscription_tier AS ENUM ('free', 'basic', 'pro', 'premium');

CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled', 'trial');

CREATE TYPE notification_type AS ENUM ('general', 'emergency', 'personal');

CREATE TYPE moderation_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE hospital_type AS ENUM ('hospital', 'clinic', 'diagnostic', 'nursing_home');

CREATE TYPE app_role AS ENUM ('super_admin', 'admin', 'moderator', 'editor');

CREATE TABLE locations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id          UUID REFERENCES locations(id) ON DELETE RESTRICT,
  type               location_type NOT NULL,
  name_translations  JSONB NOT NULL DEFAULT '{"bn": ""}'::jsonb,
  slug               TEXT NOT NULL UNIQUE,          -- for SEO URLs (S21)
  latitude           NUMERIC(10,7),
  longitude          NUMERIC(10,7),
  display_order      INT NOT NULL DEFAULT 0,
  is_active          BOOLEAN NOT NULL DEFAULT true, -- admin can hide without deleting
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at         TIMESTAMPTZ
);

-- Constraint: a 'state' must have no parent; everything else must have one
ALTER TABLE locations ADD CONSTRAINT chk_location_parent
  CHECK (
    (type = 'state' AND parent_id IS NULL) OR
    (type != 'state' AND parent_id IS NOT NULL)
  );

CREATE INDEX idx_locations_parent ON locations(parent_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_locations_type   ON locations(type) WHERE deleted_at IS NULL;
CREATE INDEX idx_locations_slug   ON locations(slug) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_locations_updated_at BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Recursive helper VIEW: full breadcrumb path for any location
-- (used for "West Bengal › Cooch Behar › Tufanganj" display everywhere)
CREATE OR REPLACE VIEW location_paths AS
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

CREATE TABLE app_settings (
  id                  INT PRIMARY KEY DEFAULT 1,
  app_name            TEXT NOT NULL DEFAULT 'Vytanexa',
  logo_url            TEXT,
  favicon_url         TEXT,
  theme_colors        JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- { "brand_600": "#1756C8", "life_600": "#0CAF74", ... }
    -- admin theme editor (S-Admin) writes here; app reads at build/runtime
  homepage_settings   JSONB NOT NULL DEFAULT '{"sections": []}'::jsonb,
    -- [{ id, visible, order }] — drives S04 section rendering
  footer_links        JSONB NOT NULL DEFAULT '[]'::jsonb,
  social_links        JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- { "facebook": "...", "instagram": "...", "youtube": "..." }
  contact_phone       TEXT,
  contact_email       TEXT,
  contact_whatsapp    TEXT,
  default_locale      TEXT NOT NULL DEFAULT 'bn',
  supported_locales   TEXT[] NOT NULL DEFAULT ARRAY['bn','en','hi'],
  features            JSONB NOT NULL DEFAULT '{
    "community_qa": false,
    "polls": true,
    "articles": true,
    "blood_services": true,
    "voice_search": true
  }'::jsonb,
    -- feature flags — referenced throughout S13-S15 as "gated behind
    -- app_settings.features.X" — scaling-ready: new flags added without
    -- migration, just JSON key addition
  seo_defaults        JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by          UUID,  -- references admin_users(id), added in Part 5

  CONSTRAINT chk_singleton CHECK (id = 1)
);

INSERT INTO app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TRIGGER trg_app_settings_updated_at BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE custom_pages (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  meta_title       TEXT,
  meta_description TEXT,
  og_image         TEXT,
  show_in_menu     BOOLEAN NOT NULL DEFAULT false,
  menu_icon        TEXT,                 -- emoji or icon key
  menu_order       INT NOT NULL DEFAULT 0,
  is_published     BOOLEAN NOT NULL DEFAULT false,
  blocks           JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- [{ type: 'hero'|'rich_text'|'image'|'poll'|'qa_embed'|
    --    'report_form'|'magazine_grid'|'doctor_grid'|'hospital_grid'|
    --    'cta_banner'|'faq_accordion'|'spacer', ...type-specific fields }]
    -- Full block shape reference: S19 in VYTANEXA-BLUEPRINT.md
  created_by       UUID,   -- admin_users(id), Part 5
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX idx_custom_pages_slug ON custom_pages(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_custom_pages_menu ON custom_pages(menu_order)
  WHERE show_in_menu = true AND is_published = true AND deleted_at IS NULL;

CREATE TRIGGER trg_custom_pages_updated_at BEFORE UPDATE ON custom_pages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- report_form submissions land here (generic — any block-type form)
CREATE TABLE page_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id         UUID NOT NULL REFERENCES custom_pages(id) ON DELETE CASCADE,
  block_index     INT NOT NULL,           -- which report_form block on the page
  submission_data JSONB NOT NULL,         -- admin-defined field shape, free-form
  submitter_phone TEXT,
  ip_address      INET,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_page_submissions_page ON page_submissions(page_id);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_submissions ENABLE ROW LEVEL SECURITY;

-- Public read: active locations only
CREATE POLICY locations_public_read ON locations
  FOR SELECT USING (deleted_at IS NULL AND is_active = true);

-- Public read: app_settings (needed client-side for theme/footer/flags)
CREATE POLICY app_settings_public_read ON app_settings
  FOR SELECT USING (true);

-- Public read: only published, non-deleted custom pages
CREATE POLICY custom_pages_public_read ON custom_pages
  FOR SELECT USING (deleted_at IS NULL AND is_published = true);

-- Public INSERT only on page_submissions (write-only form drop box;
-- no public SELECT — admin reads via service role)
CREATE POLICY page_submissions_public_insert ON page_submissions
  FOR INSERT WITH CHECK (true);

-- All WRITE access (INSERT/UPDATE/DELETE on locations/app_settings/
-- custom_pages) is service-role ONLY — no policy = no client access.
-- Admin Panel backend uses the Supabase service role key (server-side
-- only, never exposed to browser) to bypass RLS entirely for admin ops.
