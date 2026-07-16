# TODO.md — Vytanexa Execution Checklist
**Rule: work top to bottom, do not skip items, verify each before checking
it off, commit+push after each completed item or small logical group.
Do not stop to ask "what next" — this file IS the answer. Only stop for
a genuine blocker (missing credential, ambiguous product decision with
real stakes) and note the blocker inline instead of skipping ahead.**

Update this file's checkboxes as the single source of progress truth,
alongside `PROJECT-CONTEXT.md` §5 and `IMPLEMENTATION-ROADMAP.md`.

---

## SCHEMA GAP FOUND — MUST FIX BEFORE S09
- [ ] Add `symptoms` table (migration 0008) — VYTANEXA-BLUEPRINT.md § S09
      needs: title_translations, slug, cover_image_url, is_emergency
      flag, recommended category_ids (array or join table), body/
      description_translations. **This table does not exist yet** —
      caught during TODO planning, not silently glossed over. Design
      it properly (soft-delete, RLS public-read pattern matching every
      other content table) rather than bolting it on carelessly.
- [ ] Regenerate `packages/database/types.ts` after adding it
- [ ] Update `DATABASE-SCHEMA.md` itself with a new "PART 6 — SYMPTOMS"
      section so the markdown source of truth stays accurate (per
      README.md's stated rule: markdown wins, .sql is derived)

---

## S04 — HOME PAGE (remaining sections)
- [x] SEC-03 Quick Stats Bar (done)
- [x] SEC-04 Quick Actions Row (done)
- [x] SEC-05 Category Grid (done)
- [ ] SEC-01 Announcement Banner (queries `notifications` where
      show_as_banner=true; empty-state hidden until admin creates one)
- [ ] SEC-02 Hero Banner Slider (needs an `ads` table — **another
      schema gap**: no `ads` table exists either! Check DATABASE-SCHEMA.md
      before building; add migration 0009 if confirmed missing)
- [ ] SEC-06 Popular Doctors (real query: verified doctors, location-
      sorted once location system exists; for now sort by rating/featured)
- [ ] SEC-07 Native Ad (same `ads` table dependency as SEC-02)
- [ ] SEC-08 Trending Hospitals (real query, horizontal scroll)
- [ ] SEC-09 Symptom Quick Access (depends on the new `symptoms` table above)
- [ ] SEC-10 Health Articles (real query against `articles`, conditional
      on `is_published` rows existing)
- [ ] SEC-11 Community Q&A Teaser (feature-flag gated via `app_settings.
      features.community_qa`)
- [ ] SEC-12 Blood Services CTA (static banner + link, no query needed)
- [ ] SEC-13 PWA Install Banner (client-side, visit-count + beforeinstallprompt)
- [ ] Footer (reads `app_settings` singleton row — social_links,
      footer_links, contact_*)
- [ ] Wire `app_settings.homepage_settings` for admin-controlled section
      order/visibility (currently hardcoded render order)

## S02/S03 — Still-Missing Shell Pieces
- [ ] Location Chip component (S02 § 2.4) — needs Location Picker Sheet
- [ ] Location Picker Sheet (S03 § "Location Setup") — real query
      against `locations` table (currently empty; build the UI to
      handle that empty state correctly per spec, don't fake data)
- [ ] Emergency FAB (S02 § 2.3) — global, all pages
- [ ] S03 full onboarding flow (splash, language select, slides,
      location setup, optional sign-in) — currently fully unbuilt

## S05 — SEARCH
- [ ] `/search` page: empty state (recent/trending/shortcuts)
- [ ] Typing state — autocomplete dropdown, parallel Supabase queries
- [ ] Results state — tabbed, filters, sort
- [ ] No-results state
- [ ] Voice search (SpeechRecognition API integration)

## S06 — DOCTOR LIST
- [ ] `/doctors` page: filter chips, sort, infinite scroll
- [ ] Filter sheet (district, specialty multi-select, fee range, rating,
      availability, verified, language)
- [ ] Doctor card component (full variant) — reusable, used again in
      S04 SEC-06, S05 results, S07 related, SEO pages

## S07 — DOCTOR PROFILE ★ most critical page ★
- [ ] `/doctors/[slug]` route, SSG+ISR
- [ ] Hero card, trust strip, sticky tab bar
- [ ] Tab 1 তথ্য (Info)
- [ ] Tab 2 চেম্বার (Chambers) — schedule grouping + live status algorithm
- [ ] Tab 3 রিভিউ (Reviews) — list + submission modal + rate limiting
- [ ] Tab 4 হাসপাতাল (Hospital Affiliations)
- [ ] Sticky bottom action bar
- [ ] Appointment Lead Capture sheet — writes to `leads` table
- [ ] Share sheet + OG meta + JSON-LD

## S08 — HOSPITAL LIST/DETAIL
- [ ] `/hospitals` list page
- [ ] `/hospitals/[slug]` detail page — gallery, services, linked doctors

## S09 — SYMPTOMS (blocked on schema gap above)
- [ ] `/symptoms` list page
- [ ] `/symptoms/[slug]` detail page — emergency flagging visual

## S10-S12 — Health Services
- [ ] S10 Lab/Diagnostic test search (`/health/lab-tests`)
- [ ] S11 Blood Services page (`/health/blood-services`) — donor list
      (via `public_blood_donors` view, never raw table), registration form
- [ ] S12 Emergency system — FAB condensed sheets + full `/emergency`
      page + offline-cached national numbers

## S13-S15 — Community
- [ ] S13 Articles list + detail
- [ ] S14 Q&A (feature-flag gated)
- [ ] S15 Polls + Data Report ("ভুল তথ্য জানান") cross-cutting action

## S16-S18 — Account & Settings
- [ ] S16 More page (hamburger menu, real content replacing placeholder)
- [ ] S17 Account (profile/favorites/history) — auth-guarded route group
- [ ] S18 Settings (language/location/notifications/privacy)

## S19-S21 — Dynamic & SEO
- [ ] S19 Custom page renderer (`/page/[slug]`) + BlockRenderer switch
      for all 12 block types
- [ ] S20 Notifications center (`/notifications`)
- [ ] S21 SEO landing pages (`/[state]/[district]/[specialty]`) +
      sitemap.xml route handler

## S22 — Infrastructure
- [ ] next-intl setup, cookie-based locale switching, messages/*.json
- [ ] PWA config (next-pwa, manifest, offline page, precaching)
- [ ] Auth flow: phone+OTP and Google sign-in via Supabase Auth
- [ ] Zustand stores (onboarding, filters, ui state)

## Cross-Cutting (do once, applies everywhere)
- [ ] Zod validation schemas for every form (leads, reviews, questions,
      polls, donor registration, data reports)
- [ ] Rate-limiting wired into every public-insert Route Handler using
      the `check_rate_limit()` DB function
- [ ] Analytics event firing (`analytics_events` inserts) on every
      spec'd interaction (S07's event list, search, shares, etc.)
- [ ] Error boundaries + loading.tsx skeletons per route
- [ ] Accessibility pass (aria-labels, focus states) per S01 § 11

---

## ADMIN PANEL (apps/admin) — starts after user-app core is functional
- [ ] A01-A02 shell: sidebar, auth/roles, layout
- [ ] A03 Dashboard + moderation queue pattern (shared component)
- [ ] A04 Locations Manager (tree UI + CSV bulk import) — **high
      priority once reached: real location data entry unblocks the
      Location Picker (S02/S03) and every district-scoped query above**
- [ ] A04 Categories Manager
- [ ] A05 Doctors Manager (list/CRUD/verification/chambers)
- [ ] A06 Hospitals/Ambulance/Blood Bank Managers
- [ ] A07 Homepage Section Control + Theme Editor (god mode core)
- [ ] A08 Footer/Social/Contact + Feature Flags + Menu Manager
- [ ] A09 Custom Page / Block Builder
- [ ] A10 Articles CMS + Q&A management
- [ ] A11 Polls + Notifications composer
- [ ] A12 Subscription Plans + Ads Manager
- [ ] A13 Leads Inbox
- [ ] A14 Admin Users/Roles + Audit Log Viewer
- [ ] A15 Analytics Dashboard + Settings

---

## PHASE 6 — Hardening & Launch (from IMPLEMENTATION-ROADMAP.md)
- [ ] Full RLS audit — attempt to break every table from an anon client
- [ ] Performance pass against S22 budgets
- [ ] Real location data entry (via A04 CSV import)
- [ ] Payment gateway decision + integration
- [ ] Vercel deployment, `admin.vytanexa.app` subdomain
- [ ] Remove any dev-only artifacts before public launch

---

## WORKING RULES (reaffirmed)
1. Check items off only after real verification (typecheck + build,
   not assumption). If something can't be verified in this sandbox
   (e.g. network-gated), say so explicitly rather than guessing.
2. Every checked item gets a commit + push before moving to the next.
3. If a step reveals a missing dependency (like the symptoms/ads table
   gaps found above), add it as a new checklist item immediately —
   don't work around it with fake data or a shortcut.
4. No demo/dummy/seed data, ever, per the Production Data Rule.
5. Small steps. A "step" is one component, one migration, one page —
   not "all of S07" in one shot.
