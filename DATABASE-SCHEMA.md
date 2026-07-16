# Vytanexa — Complete Database Schema
**Engine:** PostgreSQL 15+ (Supabase) | **Convention:** snake_case, UUID PKs,
soft-delete everywhere, `*_translations` JSONB for i18n content.
**Status:** Built incrementally, part by part. See TOC.

---

## TABLE OF CONTENTS

- [x] PART 1 — Core: Extensions, Enums, Locations Hierarchy, App Settings, Custom Pages
- [x] PART 2 — Doctors: categories, doctors, chambers, doctor_hospital_links, subscription_plans, subscriptions
- [x] PART 3 — Hospitals: hospitals, test_catalog, blood_donors, blood_bank_inventory, ambulance_services
- [x] PART 4 — Engagement: reviews (+rating trigger), leads, questions/answers, polls, articles, notifications
- [x] PART 5 — System: users, favorites, admin_users, data_reports, analytics_events, audit_logs, rate_limits, cross-part FK completion, RLS
- [x] PART 6 — Symptoms: symptoms, symptom_categories (added post-launch-planning, see TODO.md)
- [x] PART 7 — Ads: ads table + placement enum (added post-launch-planning, see TODO.md)

---

## GLOBAL CONVENTIONS (Apply to Every Table Below)

```sql
-- Every table has:
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()   -- auto-updated via trigger
deleted_at  TIMESTAMPTZ NULL                      -- soft delete, NULL = active

-- Every SELECT policy for public/authenticated roles filters:
WHERE deleted_at IS NULL

-- i18n content columns use this shape (JSONB, not separate translation tables —
-- decision rationale: query simplicity + admin edits one row, not N rows):
name_translations JSONB NOT NULL DEFAULT '{"bn": ""}'::jsonb
-- Example value: {"bn": "কোচবিহার", "en": "Cooch Behar", "hi": "कूच बिहार"}
-- Read helper (app-side): getLocalizedField(row, 'name', locale)
--   → fallback chain: locale → 'bn' → 'en' → first available key
```

---

## PART 1 — CORE

### 1.1 Extensions
```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";     -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- fuzzy/ILIKE search speed
CREATE EXTENSION IF NOT EXISTS "unaccent";     -- search normalization
```

### 1.2 Shared Trigger Function — `updated_at` auto-touch
```sql
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
```

### 1.3 Enums
```sql
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
```

### 1.4 Locations — Self-Referencing Hierarchy
> Design decision from our earlier discussion: ONE table, self-referencing,
> handles State → District → Sub-district → Ward at any depth, fully dynamic,
> no pre-seeded data, admin-created only. Confirmed with you in S-planning.

```sql
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
```

**Why a VIEW, not a materialized path column?** Location depth is small
(max 4 levels) and admin edits are infrequent — recursive CTE cost is
negligible, and we avoid the complexity/staleness risk of maintaining a
denormalized path string on every insert/move.

### 1.5 App Settings — Singleton Table (Admin God Mode Root)
> One row only. This table is the backbone of "admin controls everything" —
> homepage section order, footer, social links, feature flags, contact info.

```sql
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
```

**Why JSONB instead of dozens of normalized tables for settings?**
This data is: (a) read constantly, everywhere, on every page load —
one row fetch beats N joins; (b) edited only by admin, rarely; (c)
shape evolves over time as god-mode grows. JSONB is the right trade-off
here. This is the ONE deliberate exception to strict normalization in
this schema, and it's intentional, not laziness.

### 1.6 Custom Pages — Block Builder (Powers S19)
```sql
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
```

### 1.7 Part 1 — Row Level Security (RLS)
```sql
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
```

---

## PART 2 — DOCTORS

### 2.1 Categories (Specialties) — Referenced by S04, S05, S06
```sql
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
```

### 2.2 Doctors
```sql
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
```

**Why `rating_avg`/`rating_count` denormalized on `doctors` instead of
always computing from `reviews` live?** This table is read on every
list page, every card, every scroll tick — computing `AVG()`/`COUNT()`
across the reviews table per-row on every list query would kill
performance at scale. Instead: a trigger on `reviews` (approved
INSERT/UPDATE/DELETE) recalculates and writes these two fields. Single
source of truth stays `reviews`; these are a maintained cache — the
standard, correct pattern for this exact problem. Trigger defined in
Part 4 alongside the `reviews` table itself.

### 2.3 Chambers (Doctor's Practice Locations)
```sql
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
```

### 2.4 Doctor ↔ Hospital Affiliations (Powers S07 Tab 4)
```sql
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
```

### 2.5 Subscription Plans + Subscriptions (Income Stream Engine)
> Generic, entity-agnostic — powers PRO/PREMIUM badges on both doctors
> (S06/S07) and hospitals (S08), plus future income streams (S-planning
> Point 4: pay-per-lead, featured listing, analytics access) without
> needing a new table per income stream. This is the extensibility
> decision for "Income System বাড়ানো প্লানিং" you asked about.

```sql
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
```

### 2.6 Part 2 — Row Level Security
```sql
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
```

---

## PART 3 — HOSPITALS & FACILITY SERVICES

### 3.1 Test Catalog (Powers S10 Lab/Diagnostic Search)
> A master reference list — NOT hospital-specific. Hospitals tag which
> tests they offer by referencing this catalog's canonical names in
> their `services[]` array. Keeps admin workload minimal (no per-hospital
> test CMS) per the design decision made in S10.

```sql
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
```

### 3.2 Hospitals
```sql
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
```

### 3.3 Blood Donors (Opt-In Directory — S11)
```sql
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
```

### 3.4 Blood Bank Inventory (Optional, Freshness-Gated — S11)
```sql
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
```

### 3.5 Ambulance Services (Standalone Table — Per Our Discussion)
> Confirmed decision: separate from `hospitals` because fields diverge
> (vehicle_count, icu_equipped, per_km_rate) and providers may be
> independent operators with no hospital affiliation.

```sql
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
```

### 3.6 Part 3 — Row Level Security
```sql
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
```

---

## PART 4 — ENGAGEMENT

### 4.1 Reviews (Polymorphic — Doctors + Hospitals, Powers S07 Tab 3)
```sql
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
```

### 4.2 Leads — Appointment Requests (Income Stream, Powers S07)
```sql
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
```

### 4.3 Q&A Community (S14, Feature-Flag Gated)
```sql
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
```

### 4.4 Polls (S15)
```sql
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
```

### 4.5 Articles (S13 Health Magazine)
```sql
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
```

### 4.6 Notifications (S20)
```sql
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
```

### 4.7 Part 4 — Row Level Security
```sql
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
```

---

## PART 5 — SYSTEM (Final Part)

### 5.1 Users (Extends Supabase `auth.users`)
> Supabase Auth handles credentials/OTP/sessions in its own `auth.users`
> table (not ours to touch). This table holds the app-specific profile
> data, 1:1 linked by shared UUID.

```sql
CREATE TABLE users (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name                TEXT,
  phone               TEXT UNIQUE,
  email               TEXT,
  preferred_language  TEXT NOT NULL DEFAULT 'bn',
  default_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  notification_prefs  JSONB NOT NULL DEFAULT '{
    "general": true, "emergency": true, "articles": true
  }'::jsonb,
    -- "emergency" is UI-locked true in S18 (non-togglable) but stored
    -- here for schema completeness / future flexibility if that
    -- product decision ever changes
  is_guest_converted  BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ   -- soft delete = S17 "account deletion"
);

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-create a `users` row whenever Supabase Auth creates an
-- `auth.users` row (phone/Google sign-up) — keeps the two tables
-- always in sync without app-layer glue code remembering to do it.
CREATE OR REPLACE FUNCTION handle_new_auth_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, phone, email)
  VALUES (NEW.id, NEW.phone, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();
```

### 5.2 User Favorites (S17)
```sql
CREATE TABLE user_favorites (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type  entity_type NOT NULL,   -- 'doctor' | 'hospital'
  entity_id    UUID NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_fav_entity CHECK (entity_type IN ('doctor','hospital')),
  UNIQUE(user_id, entity_type, entity_id)
);

CREATE INDEX idx_favorites_user ON user_favorites(user_id);
```

### 5.3 Admin Users & Roles (Foundation for Admin Panel)
```sql
CREATE TABLE admin_users (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  role         app_role NOT NULL DEFAULT 'editor',
  permissions  JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- fine-grained overrides beyond role defaults, e.g.
    -- { "can_edit_theme": true, "can_manage_admins": false }
    -- Full permission matrix defined in the Admin Panel spec.
  is_active    BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_admin_users_updated_at BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Helper used inside RLS policies to check "is this session an admin"
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE id = auth.uid() AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### 5.4 Data Reports ("ভুল তথ্য জানান" — S15)
```sql
CREATE TABLE data_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   entity_type NOT NULL,
  entity_id     UUID NOT NULL,
  reason        TEXT NOT NULL,   -- 'wrong_phone'|'wrong_address'|'wrong_hours'|'closed'|'other'
  detail        TEXT,
  reporter_ip   INET,
  status        TEXT NOT NULL DEFAULT 'open',  -- 'open'|'resolved'|'dismissed'
  resolved_by   UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_report_status CHECK (status IN ('open','resolved','dismissed'))
);

CREATE INDEX idx_data_reports_open ON data_reports(status) WHERE status = 'open';
CREATE INDEX idx_data_reports_entity ON data_reports(entity_type, entity_id);
```

### 5.5 Analytics Events (Generic Event Log)
> One flexible table for every tracked interaction across S04-S22
> (doctor_view, call_click, share, search, poll_vote, etc.) rather than
> a bespoke table per event type — this is the correct trade-off for
> write-heavy, rarely-individually-queried, aggregate-reported data.

```sql
CREATE TABLE analytics_events (
  id            BIGSERIAL PRIMARY KEY,   -- BIGSERIAL not UUID: high write
                                          -- volume table, sequential int
                                          -- is cheaper to index than UUID
  event_type    TEXT NOT NULL,
    -- 'doctor_view','call_click','whatsapp_click','lead_submit','share',
    -- 'review_submit','search','search_select','article_view',
    -- 'poll_vote','emergency_call_click', etc. — open-ended by design
  entity_type   TEXT,
  entity_id     UUID,
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- event-specific extra fields, e.g. { "method": "whatsapp" } for
    -- share events, { "query": "...", "result_count": 5 } for search
  location_id   UUID REFERENCES locations(id) ON DELETE SET NULL,
  device_type   TEXT,
  session_id    TEXT,
  user_id       UUID,   -- nullable, set if signed in
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partitioned by month for long-term scale (5-year horizon = this
-- table will be the single largest in the database by an order of
-- magnitude; partitioning keeps queries and vacuum fast as it grows)
-- Actual partition creation is an operational/migration-script concern,
-- noted here as the intended strategy:
--   CREATE TABLE analytics_events_YYYY_MM PARTITION OF analytics_events
--   FOR VALUES FROM ('YYYY-MM-01') TO ('YYYY-MM+1-01');

CREATE INDEX idx_analytics_type       ON analytics_events(event_type, created_at DESC);
CREATE INDEX idx_analytics_entity     ON analytics_events(entity_type, entity_id);
CREATE INDEX idx_analytics_created    ON analytics_events(created_at DESC);
```

### 5.6 Audit Logs (Admin God-Mode Accountability)
> Referenced in our earlier planning discussion — every admin edit,
> anywhere in the god-mode panel, is logged here. Non-negotiable for a
> system where a single admin role can edit almost anything.

```sql
CREATE TABLE audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  admin_id    UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,        -- 'create'|'update'|'delete'|'restore'|'publish'
  entity_type TEXT NOT NULL,        -- table/domain name, e.g. 'doctor','app_settings'
  entity_id   TEXT,                 -- nullable for singleton settings edits
  before_data JSONB,
  after_data  JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_admin  ON audit_logs(admin_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);

-- Written by the Admin Panel's server-side mutation layer (every
-- write route wraps its Supabase call with an audit_logs insert) —
-- not a DB trigger, because we need the before/after diff and the
-- acting admin_id, which are cleanest to capture at the application
-- layer where the request context is already available.
```

### 5.7 Rate Limits (Generic, Reusable Mechanism)
> Referenced throughout: leads (3/phone/doctor/24h), reviews (3/IP/
> doctor/24h), blood donor registration (1/phone/90days). ONE mechanism,
> not three bespoke ones — this is the extensibility payoff.

```sql
CREATE TABLE rate_limit_events (
  id          BIGSERIAL PRIMARY KEY,
  limit_key   TEXT NOT NULL,   -- e.g. 'lead:9876543210:doctor:<uuid>'
                                --      'review:1.2.3.4:doctor:<uuid>'
                                --      'donor_register:9876543210'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rate_limit_key_time ON rate_limit_events(limit_key, created_at DESC);

-- Reusable check function — call before any rate-limited insert:
--   SELECT check_rate_limit('lead:9876543210:doctor:<uuid>', 3, interval '24 hours');
-- Returns TRUE if the action is allowed (records the event as a side
-- effect), FALSE if the limit is already hit.
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT, p_max_count INT, p_window INTERVAL
) RETURNS BOOLEAN AS $$
DECLARE
  current_count INT;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM rate_limit_events
  WHERE limit_key = p_key AND created_at > now() - p_window;

  IF current_count >= p_max_count THEN
    RETURN false;
  END IF;

  INSERT INTO rate_limit_events(limit_key) VALUES (p_key);
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Old rows beyond any realistic window are periodically purged via a
-- scheduled job (pg_cron or Supabase Edge Function cron) — operational
-- concern, not a schema concern; noted for completeness.
```

### 5.8 Cross-Part Foreign Key Completion
> Several tables in Parts 1-4 referenced `users(id)` / `admin_users(id)`
> before those tables existed (forward references). Completed now:

```sql
ALTER TABLE leads               ADD CONSTRAINT fk_leads_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE questions           ADD CONSTRAINT fk_questions_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE answers             ADD CONSTRAINT fk_answers_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE notification_reads  ADD CONSTRAINT fk_notif_reads_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notifications       ADD CONSTRAINT fk_notif_target_user
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notifications       ADD CONSTRAINT fk_notif_created_by
  FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL;
ALTER TABLE reviews             ADD CONSTRAINT fk_reviews_moderated_by
  FOREIGN KEY (moderated_by) REFERENCES admin_users(id) ON DELETE SET NULL;
ALTER TABLE custom_pages        ADD CONSTRAINT fk_pages_created_by
  FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL;
ALTER TABLE app_settings        ADD CONSTRAINT fk_settings_updated_by
  FOREIGN KEY (updated_by) REFERENCES admin_users(id) ON DELETE SET NULL;
ALTER TABLE polls               ADD CONSTRAINT fk_polls_created_by
  FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL;
```

### 5.9 Part 5 — Row Level Security
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_own_read_write ON users
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY favorites_own_all ON user_favorites
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- admin_users: an admin can read their own row (for permission checks
-- client-side); full admin roster management is service-role only
CREATE POLICY admin_users_own_read ON admin_users
  FOR SELECT USING (auth.uid() = id);

-- data_reports: public insert-only (matches leads pattern — a data
-- correction report is a one-way write, no read-back needed)
CREATE POLICY data_reports_public_insert ON data_reports
  FOR INSERT WITH CHECK (true);

-- analytics_events: public insert-only (client fires events), no
-- public read whatsoever — this is business intelligence data
CREATE POLICY analytics_public_insert ON analytics_events
  FOR INSERT WITH CHECK (true);

-- audit_logs, rate_limit_events: ZERO public access, either direction.
-- Written exclusively by server-side (service role / SECURITY DEFINER
-- functions). No policy for anon/authenticated = fully locked.
```

---

---

## PART 6 — SYMPTOMS
> **Gap found during Phase 2 execution planning** (documented in
> TODO.md): `VYTANEXA-BLUEPRINT.md` § S09 (Symptoms Page) and § S04
> SEC-09 both reference a symptoms table that the original Parts 1-5
> pass never actually created. Added here with the same conventions
> as every other content table.

```sql
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
```

**Many-to-many with categories** — a symptom can recommend multiple
specialties (e.g. "chest pain" → cardiology AND general medicine), and
one specialty can be recommended by multiple symptoms. A join table
gives real referential integrity, consistent with the
`doctor_hospital_links` pattern from Part 2:

```sql
CREATE TABLE symptom_categories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symptom_id   UUID NOT NULL REFERENCES symptoms(id) ON DELETE CASCADE,
  category_id  UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  display_order INT NOT NULL DEFAULT 0,

  UNIQUE(symptom_id, category_id)
);

CREATE INDEX idx_symptom_categories_symptom  ON symptom_categories(symptom_id);
CREATE INDEX idx_symptom_categories_category ON symptom_categories(category_id);
```

**RLS:**
```sql
ALTER TABLE symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptom_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY symptoms_public_read ON symptoms
  FOR SELECT USING (deleted_at IS NULL AND is_active = true);

CREATE POLICY symptom_categories_public_read ON symptom_categories
  FOR SELECT USING (true);
```

---

## PART 7 — ADS
> **Second gap found during the same planning pass**: `VYTANEXA-
> BLUEPRINT.md` § S04 SEC-02 (Hero Banner Slider) / SEC-07 (Native Ad)
> and `ADMIN-PANEL-SPEC.md` § A12 (Ads Manager) all reference an `ads`
> table that was never created. This schema matches A12's field set
> exactly, so the admin UI spec and this table stay in lockstep.

```sql
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
```

**RLS** — matches the exact query contract already documented in S04
SEC-02 ("WHERE placement=... AND is_active=true AND start_date<=today
AND end_date>=today"), enforced at the database layer too:
```sql
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY ads_public_read ON ads
  FOR SELECT USING (
    deleted_at IS NULL AND is_active = true
    AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE
  );
```

Impressions/clicks are tracked via `analytics_events`
(`event_type='ad_impression'/'ad_click'`, `entity_id=ads.id`) per the
existing generic analytics design (Part 5) — no separate counter
columns needed, consistent with doctor/hospital view tracking.

---

## ✅ DATABASE SCHEMA — COMPLETE (Parts 1–7)

**39 tables · 3 views · 6 trigger functions · full RLS coverage.**
(Updated from the original "37 tables, Parts 1-5" after Parts 6-7 were
added post-launch-planning — see TODO.md.)

### Design Principles Applied Throughout
```
✅ Soft delete everywhere        — deleted_at, nothing hard-deleted
✅ i18n via JSONB                — name_translations pattern, consistent
✅ Denormalized counters         — rating/vote/answer counts, trigger-synced
✅ Defense-in-depth security     — RLS enforces business rules, not just app code
✅ Generic > bespoke             — subscriptions, rate_limits, analytics_events
                                    all polymorphic/reusable, not one-off tables
✅ Column-level privacy          — public views omit sensitive fields entirely
                                    (blood donor phone, poll vote anonymity)
✅ Audit trail                   — every admin action logged, accountable
✅ No production seed data       — this schema defines STRUCTURE only; zero
                                    INSERT statements for demo/dummy content,
                                    per your PRODUCTION DATA RULE from the
                                    original brief
```

### What's Deliberately NOT in This Schema (Scope Notes)
```
- Payment/billing tables    — subscriptions.payment_ref is a placeholder
                               for whichever gateway (Razorpay/Stripe) is
                               chosen later; full billing schema is a
                               separate, focused addition when that
                               integration is scoped
- Appointment booking calendar — leads capture INTENT only (S07 spec is
                               explicit: "not a confirmed booking"); a
                               real slot-booking system is a Phase 2+
                               feature needing its own schema design
- Push notification tokens  — noted as future in S20; add a
                               `push_subscriptions` table when Web Push
                               is actually implemented
```

---

_(Database schema file complete, Parts 1-7. Next: ADMIN-PANEL-SPEC —
the Next.js "Ultra God Mode" admin application, screen by screen.)_
