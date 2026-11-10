-- Vytanexa Database Migration
-- Deferred gap noted in TODO.md during S09 execution: VYTANEXA-
-- BLUEPRINT.md § S09 "Symptom Detail Page" mockup shows two content
-- sections (common_causes[], when_to_see_doctor[]) that had no
-- backing columns on `symptoms` (migration 0008 only added
-- description_translations). Applied live via Supabase MCP connector
-- once it came back online (the project had auto-paused, not a
-- connector bug).
--
-- Shape: JSONB array of per-locale translation objects, e.g.
--   [{"bn": "কারণ ১", "en": "Cause 1"}, {"bn": "কারণ ২", "en": "Cause 2"}]
-- consistent with the project's `*_translations` JSONB convention,
-- just pluralized into an array since these are lists of items, not
-- a single field.

ALTER TABLE symptoms
  ADD COLUMN common_causes_translations JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN when_to_see_doctor_translations JSONB NOT NULL DEFAULT '[]'::jsonb;
