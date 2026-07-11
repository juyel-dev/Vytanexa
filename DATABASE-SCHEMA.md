# Vytanexa — Complete Database Schema
**Engine:** PostgreSQL 15+ (Supabase) | **Convention:** snake_case, UUID PKs,
soft-delete everywhere, `*_translations` JSONB for i18n content.
**Status:** Built incrementally, part by part. See TOC.

---

## TABLE OF CONTENTS

- [x] PART 1 — Core: Extensions, Enums, Locations Hierarchy, App Settings, Custom Pages
- [x] PART 2 — Doctors: categories, doctors, chambers, doctor_hospital_links, subscription_plans, subscriptions
- [ ] PART 3 — Hospitals: hospitals, test_catalog, blood_donors, ambulance_services
- [ ] PART 4 — Engagement: reviews, leads, Q&A, polls, articles, notifications
- [ ] PART 5 — System: users, favorites, analytics_events, audit_logs, rate_limits, RLS policies (global)

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

_(File continues — PART 3: Hospitals, Test Catalog, Blood Donors, Ambulance Services, in next commit)_
