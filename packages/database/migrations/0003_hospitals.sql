-- Vytanexa Database Migration
-- Auto-extracted from DATABASE-SCHEMA.md — do not hand-edit divergently;
-- update the source markdown and re-run the extraction script instead.
-- Source of truth: /DATABASE-SCHEMA.md

-- PART 3 — HOSPITALS & FACILITY SERVICES

CREATE TABLE test_catalog (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_translations JSONB NOT NULL DEFAULT '{"bn": ""}'::jsonb,
  canonical_key     TEXT NOT NULL UNIQUE,     -- 'cbc', 'xray_chest', 'usg_abdomen'
  aliases           TEXT[] NOT NULL DEFAULT '{}', -- ['CBC','Complete Blood Count','সিবিসি']
  category          TEXT,                      -- 'blood','imaging','cardiac' etc.
  is_popular        BOOLEAN NOT NULL DEFAULT false, -- S10 popular-chip grid
  display_order     INT NOT NULL DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_test_catalog_aliases ON test_catalog USING GIN(aliases);
CREATE INDEX idx_test_catalog_popular ON test_catalog(is_popular)
  WHERE is_popular = true AND is_active = true;

CREATE TRIGGER trg_test_catalog_updated_at BEFORE UPDATE ON test_catalog
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE hospitals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  TEXT NOT NULL UNIQUE,
  name_translations     JSONB NOT NULL DEFAULT '{"bn": ""}'::jsonb,
  type                  hospital_type NOT NULL,
  cover_image_url       TEXT,
  gallery_images        TEXT[] NOT NULL DEFAULT '{}',
  location_id           UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  address_line          TEXT NOT NULL,
  latitude              NUMERIC(10,7),
  longitude             NUMERIC(10,7),
  map_link              TEXT,
  phone                 TEXT NOT NULL,
  whatsapp_number       TEXT,
  description_translations JSONB NOT NULL DEFAULT '{}'::jsonb,
  services              TEXT[] NOT NULL DEFAULT '{}',
    -- canonical_key values from test_catalog + general services
    -- ('cbc','xray_chest','icu','emergency_24h', ...)
  facility_tags         TEXT[] NOT NULL DEFAULT '{}',
    -- ['icu','ambulance','emergency_24h','blood_bank'] — drives the
    -- small facility pill badges in S04 SEC-08 and S08 cards
  has_emergency_dept    BOOLEAN NOT NULL DEFAULT false,  -- S12 filter gate
  operating_hours       JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- {"is_24x7": true} OR {"is_24x7": false, "schedule": [...]}
  verification_status   verification_status NOT NULL DEFAULT 'pending',
  is_featured           BOOLEAN NOT NULL DEFAULT false,
  is_trending           BOOLEAN NOT NULL DEFAULT false,
  featured_priority     INT NOT NULL DEFAULT 0,
  rating_avg            NUMERIC(2,1) NOT NULL DEFAULT 0,   -- denormalized (see 2.2 rationale)
  rating_count          INT NOT NULL DEFAULT 0,
  view_count            INT NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ
);

CREATE INDEX idx_hospitals_slug     ON hospitals(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_hospitals_location ON hospitals(location_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_hospitals_type     ON hospitals(type) WHERE deleted_at IS NULL;
CREATE INDEX idx_hospitals_verified ON hospitals(verification_status)
  WHERE deleted_at IS NULL AND verification_status = 'verified';
CREATE INDEX idx_hospitals_emergency ON hospitals(has_emergency_dept)
  WHERE has_emergency_dept = true AND deleted_at IS NULL;
CREATE INDEX idx_hospitals_services ON hospitals USING GIN(services);
CREATE INDEX idx_hospitals_facility ON hospitals USING GIN(facility_tags);
CREATE INDEX idx_hospitals_search_trgm ON hospitals USING GIN (
  (name_translations->>'bn') gin_trgm_ops, (name_translations->>'en') gin_trgm_ops
);

CREATE TRIGGER trg_hospitals_updated_at BEFORE UPDATE ON hospitals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Now that hospitals exists, complete the forward-reference from Part 2:
ALTER TABLE doctor_hospital_links
  ADD CONSTRAINT fk_dhl_hospital FOREIGN KEY (hospital_id)
  REFERENCES hospitals(id) ON DELETE CASCADE;

CREATE TABLE blood_donors (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  phone             TEXT NOT NULL,
  blood_group       TEXT NOT NULL,
    -- CHECK constraint below instead of enum — blood groups are fixed
    -- but a CHECK keeps this file simpler; either works
  location_id       UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  last_donated_at   DATE,
  consent_contact   BOOLEAN NOT NULL DEFAULT false,
  is_active         BOOLEAN NOT NULL DEFAULT true,   -- self or admin deactivate
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT chk_blood_group CHECK (
    blood_group IN ('A+','A-','B+','B-','O+','O-','AB+','AB-')
  ),
  CONSTRAINT chk_donor_consent CHECK (consent_contact = true)
    -- hard rule: a donor record without consent should never be
    -- insertable in the first place — enforced at schema level, not
    -- just app validation
);

CREATE INDEX idx_donors_blood_group ON blood_donors(blood_group)
  WHERE is_active = true AND deleted_at IS NULL;
CREATE INDEX idx_donors_location    ON blood_donors(location_id)
  WHERE is_active = true AND deleted_at IS NULL;

CREATE TRIGGER trg_blood_donors_updated_at BEFORE UPDATE ON blood_donors
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Rate limit note: "1 registration per phone per 90 days" (S11) is
-- enforced via the generic rate_limits mechanism built in Part 5,
-- not a bespoke constraint here — reusable across leads/reviews too.

CREATE TABLE blood_bank_inventory (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id   UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  blood_group   TEXT NOT NULL,
  stock_level   TEXT NOT NULL DEFAULT 'unknown', -- 'available'|'low'|'unavailable'
  reported_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_bbi_blood_group CHECK (
    blood_group IN ('A+','A-','B+','B-','O+','O-','AB+','AB-')
  ),
  CONSTRAINT chk_bbi_stock_level CHECK (
    stock_level IN ('available','low','unavailable','unknown')
  ),
  UNIQUE(hospital_id, blood_group)
);

CREATE INDEX idx_bbi_hospital ON blood_bank_inventory(hospital_id);

-- Staleness rule from S11 ("data hidden if not updated within 48hrs")
-- is a READ-time filter, not stored — app/API layer does:
--   WHERE reported_at > now() - interval '48 hours'
-- This avoids a cron job just to "expire" rows; expiry is computed,
-- not maintained.

CREATE TABLE ambulance_services (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_translations JSONB NOT NULL DEFAULT '{"bn": ""}'::jsonb,
  location_id       UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  phone             TEXT NOT NULL,
  whatsapp_number   TEXT,
  hospital_id       UUID REFERENCES hospitals(id) ON DELETE SET NULL, -- nullable: independent OK
  vehicle_count     INT,
  is_icu_equipped   BOOLEAN NOT NULL DEFAULT false,
  per_km_rate       NUMERIC(8,2),
  coverage_radius_km NUMERIC(5,1),
  is_24x7           BOOLEAN NOT NULL DEFAULT true,
  verification_status verification_status NOT NULL DEFAULT 'pending',
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX idx_ambulance_location ON ambulance_services(location_id)
  WHERE deleted_at IS NULL AND is_active = true;

CREATE TRIGGER trg_ambulance_updated_at BEFORE UPDATE ON ambulance_services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE test_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_bank_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE ambulance_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY test_catalog_public_read ON test_catalog
  FOR SELECT USING (is_active = true);

CREATE POLICY hospitals_public_read ON hospitals
  FOR SELECT USING (deleted_at IS NULL AND verification_status = 'verified');

-- Blood donors: public can READ only non-sensitive fields conceptually,
-- but Postgres RLS is row-level not column-level — so the app-layer
-- Supabase query MUST explicitly .select('name, blood_group, location_id')
-- and NEVER select phone. Column-level protection reinforced via a
-- public VIEW that omits phone entirely — safer than trusting every
-- client query to remember not to select it:
CREATE OR REPLACE VIEW public_blood_donors AS
  SELECT id, name, blood_group, location_id, last_donated_at
  FROM blood_donors
  WHERE is_active = true AND deleted_at IS NULL AND consent_contact = true;
-- App queries THIS view for donor lists, never blood_donors directly
-- from client-side code. Phone is only resolved server-side when the
-- "📞 যোগাযোগ করুন" tap fires a protected Route Handler that returns
-- a tel: redirect without ever exposing the raw number in a JSON payload.

CREATE POLICY blood_donors_service_only ON blood_donors
  FOR SELECT USING (false);  -- direct table access blocked; use the view
CREATE POLICY public_insert_donor ON blood_donors
  FOR INSERT WITH CHECK (consent_contact = true);

CREATE POLICY bbi_public_read ON blood_bank_inventory
  FOR SELECT USING (reported_at > now() - interval '48 hours');

CREATE POLICY ambulance_public_read ON ambulance_services
  FOR SELECT USING (deleted_at IS NULL AND is_active = true
    AND verification_status = 'verified');
