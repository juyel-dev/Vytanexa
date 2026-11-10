-- Vytanexa Database Migration
-- Auto-extracted from DATABASE-SCHEMA.md — do not hand-edit divergently;
-- update the source markdown and re-run the extraction script instead.
-- Source of truth: /DATABASE-SCHEMA.md

-- PART 2 — DOCTORS

CREATE TABLE categories (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_translations  JSONB NOT NULL DEFAULT '{"bn": ""}'::jsonb,
  slug               TEXT NOT NULL UNIQUE,
  icon_key           TEXT,                       -- maps to SVG icon set
  search_keywords    TEXT[] NOT NULL DEFAULT '{}', -- alias matching (S05)
  display_order      INT NOT NULL DEFAULT 0,
  is_visible_home    BOOLEAN NOT NULL DEFAULT true, -- admin toggle, S04 SEC-05
  is_active          BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at         TIMESTAMPTZ
);

CREATE INDEX idx_categories_slug ON categories(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_categories_keywords ON categories USING GIN(search_keywords);

CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE doctors (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  TEXT NOT NULL UNIQUE,
  name_translations     JSONB NOT NULL DEFAULT '{"bn": ""}'::jsonb,
  photo_url             TEXT,
  category_id           UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  degree                TEXT[] NOT NULL DEFAULT '{}',      -- ['MBBS','MD (Medicine)']
  bmdc_registration_no  TEXT,
  experience_years      INT NOT NULL DEFAULT 0,
  bio_translations      JSONB NOT NULL DEFAULT '{}'::jsonb,
  expertise_tags        TEXT[] NOT NULL DEFAULT '{}',      -- ['Diabetes','Thyroid']
  treats_conditions     TEXT[] NOT NULL DEFAULT '{}',      -- Tab 1 "treats" list
  languages             TEXT[] NOT NULL DEFAULT ARRAY['bn'],
  search_aliases        TEXT[] NOT NULL DEFAULT '{}',      -- alt spellings/nicknames
  consultation_fee_min  NUMERIC(8,2),
  consultation_fee_max  NUMERIC(8,2),
  whatsapp_number       TEXT,
  verification_status   verification_status NOT NULL DEFAULT 'pending',
  is_available          BOOLEAN NOT NULL DEFAULT true,     -- admin kill-switch
  is_featured           BOOLEAN NOT NULL DEFAULT false,
  featured_priority     INT NOT NULL DEFAULT 0,
  rating_avg            NUMERIC(2,1) NOT NULL DEFAULT 0,   -- denormalized, trigger-maintained
  rating_count          INT NOT NULL DEFAULT 0,            -- denormalized, trigger-maintained
  view_count            INT NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at             TIMESTAMPTZ,

  CONSTRAINT chk_fee_range CHECK (
    consultation_fee_max IS NULL OR consultation_fee_min IS NULL
    OR consultation_fee_max >= consultation_fee_min
  )
);

CREATE INDEX idx_doctors_slug        ON doctors(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_doctors_category    ON doctors(category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_doctors_verified    ON doctors(verification_status)
  WHERE deleted_at IS NULL AND verification_status = 'verified';
CREATE INDEX idx_doctors_featured    ON doctors(is_featured, featured_priority DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_doctors_rating      ON doctors(rating_avg DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_doctors_search_trgm ON doctors USING GIN (
  (name_translations->>'bn') gin_trgm_ops, (name_translations->>'en') gin_trgm_ops
);
CREATE INDEX idx_doctors_aliases     ON doctors USING GIN(search_aliases);

CREATE TRIGGER trg_doctors_updated_at BEFORE UPDATE ON doctors
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE chambers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id       UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  chamber_name    TEXT NOT NULL,
  location_id     UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    -- lowest-level location (sub_district or ward) — district/state
    -- resolved via location_paths view when needed for filtering
  address_line    TEXT NOT NULL,
  latitude         NUMERIC(10,7),
  longitude        NUMERIC(10,7),
  map_link         TEXT,
  phone            TEXT NOT NULL,
  whatsapp_number  TEXT,
  schedule         JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- [{ "day": "sat", "open": "15:00", "close": "21:00" }, ...]
    -- Read by S07 Tab 2 live-status + schedule-grouping algorithm
  consultation_fee NUMERIC(8,2),
  is_primary       BOOLEAN NOT NULL DEFAULT false,
  display_order    INT NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX idx_chambers_doctor   ON chambers(doctor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_chambers_location ON chambers(location_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_chambers_primary  ON chambers(doctor_id, is_primary)
  WHERE deleted_at IS NULL;

CREATE TRIGGER trg_chambers_updated_at BEFORE UPDATE ON chambers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Enforce: only ONE primary chamber per doctor
CREATE UNIQUE INDEX uq_chambers_one_primary ON chambers(doctor_id)
  WHERE is_primary = true AND deleted_at IS NULL;

CREATE TABLE doctor_hospital_links (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id    UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  hospital_id  UUID NOT NULL,   -- REFERENCES hospitals(id), FK added in Part 3
  role         TEXT,            -- 'Visiting Consultant', 'Resident Physician'
  display_order INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ,

  UNIQUE(doctor_id, hospital_id)
);

CREATE INDEX idx_dhl_doctor   ON doctor_hospital_links(doctor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_dhl_hospital ON doctor_hospital_links(hospital_id) WHERE deleted_at IS NULL;
-- FK to hospitals(id) added via ALTER TABLE at end of Part 3, once that
-- table exists (avoids forward-reference ordering issues in migration files)

CREATE TABLE subscription_plans (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier           subscription_tier NOT NULL UNIQUE,
  name_translations JSONB NOT NULL DEFAULT '{"bn": ""}'::jsonb,
  applies_to     TEXT[] NOT NULL DEFAULT ARRAY['doctor','hospital'],
  price_monthly  NUMERIC(8,2) NOT NULL DEFAULT 0,
  price_yearly   NUMERIC(8,2),
  benefits       JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- { "featured_listing": true, "analytics_access": true,
    --   "priority_support": true, "max_chambers": 5, ... }
    -- Feature-gating reads THIS, not hardcoded tier checks in app code —
    -- admin can redefine what "Pro" includes without a code deploy.
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_sub_plans_updated_at BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE subscriptions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type    entity_type NOT NULL,      -- 'doctor' | 'hospital'
  entity_id      UUID NOT NULL,             -- polymorphic — validated in app layer
                                             -- (Postgres has no polymorphic FK;
                                             -- enforced via CHECK + app-level
                                             -- integrity, standard trade-off)
  plan_id        UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  status         subscription_status NOT NULL DEFAULT 'trial',
  started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at     TIMESTAMPTZ,
  auto_renew     BOOLEAN NOT NULL DEFAULT false,
  payment_ref    TEXT,               -- external payment gateway transaction id
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_entity_type CHECK (entity_type IN ('doctor','hospital'))
);

CREATE INDEX idx_subs_entity ON subscriptions(entity_type, entity_id);
CREATE INDEX idx_subs_active ON subscriptions(entity_id)
  WHERE status = 'active';
CREATE UNIQUE INDEX uq_subs_one_active ON subscriptions(entity_type, entity_id)
  WHERE status IN ('active','trial');  -- one live subscription per entity

CREATE TRIGGER trg_subs_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE chambers ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_hospital_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY categories_public_read ON categories
  FOR SELECT USING (deleted_at IS NULL AND is_active = true);

-- CRITICAL: public only ever sees VERIFIED doctors. This is the
-- enforcement point referenced throughout S06/S07 ("unverified doctors
-- never shown publicly") — it lives here, at the database layer, not
-- just in app query filters (defense in depth: even a buggy client
-- query can't leak unverified profiles).
CREATE POLICY doctors_public_read ON doctors
  FOR SELECT USING (deleted_at IS NULL AND verification_status = 'verified');

CREATE POLICY chambers_public_read ON chambers
  FOR SELECT USING (
    deleted_at IS NULL AND is_active = true
    AND doctor_id IN (SELECT id FROM doctors WHERE verification_status = 'verified')
  );

CREATE POLICY dhl_public_read ON doctor_hospital_links
  FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY sub_plans_public_read ON subscription_plans
  FOR SELECT USING (is_active = true);

-- Subscriptions themselves are NOT publicly readable (billing data) —
-- only the resulting tier badge is exposed, via a public VIEW below.
CREATE OR REPLACE VIEW public_entity_tiers AS
  SELECT s.entity_type, s.entity_id, p.tier
  FROM subscriptions s
  JOIN subscription_plans p ON p.id = s.plan_id
  WHERE s.status = 'active' AND (s.expires_at IS NULL OR s.expires_at > now());

-- All INSERT/UPDATE/DELETE on this Part's tables: service-role only
-- (Admin Panel backend), consistent with Part 1's security model.
