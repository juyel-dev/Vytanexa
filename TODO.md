# TODO.md — Vytanexa Execution Checklist
**Rule: work top to bottom, do not skip items, verify each before checking
it off, commit+push after each completed item or small logical group.
Do not stop to ask "what next" — this file IS the answer. Only stop for
a genuine blocker (missing credential, ambiguous product decision with
real stakes) and note the blocker inline instead of skipping ahead.**

Update this file's checkboxes as the single source of progress truth,
alongside `PROJECT-CONTEXT.md` §5 and `IMPLEMENTATION-ROADMAP.md`.

---

## SCHEMA GAP FOUND — MUST FIX BEFORE S09 ✅ DONE
- [x] Add `symptoms` table (migration 0008) — done, includes
      `symptom_categories` join table for the many-to-many with
      `categories`, RLS matching every other content table
- [x] Regenerate `packages/database/types.ts` after adding it — done,
      also picked up the `ads` table (see below) in the same regen
- [x] Update `DATABASE-SCHEMA.md` with PART 6 (Symptoms) and PART 7
      (Ads) — done, table count corrected 37→39

## SECOND GAP FOUND WHILE FIXING THE FIRST — ALSO DONE
- [x] `ads` table was ALSO missing (S04 SEC-02/SEC-07, A12 all depend
      on it) — caught during the same planning pass rather than
      discovered later mid-build. Migration 0009 applied, documented
      in DATABASE-SCHEMA.md PART 7, matches A12's Ads Manager field
      set exactly.

---

## S04 — HOME PAGE ✅ ALL SECTIONS DONE
- [x] SEC-03 Quick Stats Bar (done)
- [x] SEC-04 Quick Actions Row (done)
- [x] SEC-05 Category Grid (done)
- [x] SEC-01 Announcement Banner (queries `notifications` where
      show_as_banner=true; empty-state hidden until admin creates one)
- [x] SEC-02 Hero Banner Slider (queries `ads`, client sub-component
      for auto-advance/swipe carousel; fires `ad_click` via the new
      `/api/analytics` route)
- [x] SEC-06 Popular Doctors (real query; introduced reusable
      `DoctorCard` component for reuse across S05/S06/S07 later)
- [x] SEC-07 Native Ad (queries `ads` placement='native_feed', random
      rotation among active ads)
- [x] SEC-08 Trending Hospitals (real query, horizontal scroll)
- [x] SEC-09 Symptom Quick Access (uses the new `symptoms` table,
      emergency symptoms visually flagged)
- [x] SEC-10 Health Articles (real query, conditional on published rows)
- [x] SEC-11 Community Q&A Teaser (feature-flag gated via
      `app_settings.features.community_qa`, defaults hidden)
- [x] SEC-12 Blood Services CTA (static banner)
- [x] SEC-13 PWA Install Banner (client component, visit-count +
      beforeinstallprompt capture; install button is correctly inert
      until S22's PWA/service-worker infra exists — honest, not faked)
- [x] Footer (reads `app_settings` singleton row)
- [x] Wired `app_settings.homepage_settings` for admin-controlled
      section order/visibility — built `lib/homepage-sections.ts` as
      the registry connecting section `id` strings to components,
      with `DEFAULT_SECTIONS` matching the spec's default array
      exactly as a fallback when the admin hasn't customized anything
      yet (never written back to the DB — that's the admin's data,
      not this code's to seed)

## S02/S03 — Still-Missing Shell Pieces
- [x] Location Chip component (S02 § 2.4) — reads shared Zustand
      location store, opens the picker sheet
- [x] Location Picker Sheet (S03 § "Location Setup") — cascading
      State→District→Sub-district against the live `locations` table.
      **GPS auto-detect deliberately deferred** (reverse-geocoding to
      an admin-created location row needs a mapping API or custom
      geo-matching — a real sub-feature, not something to stub).
      Manual selection (the spec's required fallback anyway) is fully
      functional.
- [x] Emergency FAB (S02 § 2.3) — global, wired into (main)/layout.tsx,
      3 expandable options each opening a condensed BottomSheet;
      national ambulance number (102) hardcoded per S12's explicit
      "never DB-dependent" requirement
- [x] Built `BottomSheet` (reusable, shared infra — used by FAB +
      Location Picker, will be reused again by S07 review/lead
      sheets, S05 filters, etc.)
- [x] Added S01's named keyframe animations (fadeIn, slideUp,
      slideInRight, scaleIn, shake) to the shared Tailwind preset —
      previously undefined, needed for BottomSheet's slide-up
- [x] Installed Zustand, built `stores/location-store.ts` (persisted)
      — first real use of the S22 cross-cutting "Zustand stores" item
- [x] S03 full onboarding flow — splash, language select, 3 slides,
      location setup (reuses LocationPickerSheet), optional sign-in
      (phone+OTP and Google via Supabase Auth). Onboarding store
      (Zustand, persisted) drives step orchestration, giving "resume
      from last completed step" (S03 Edge Cases) for free. Also built:
      `/auth/login` (standalone, for returning guests via S16/S17 soft
      -gates) and `/auth/verify` (shared OTP entry, 6 auto-advancing
      digit boxes). FirstRunGate wired into (main)/layout.tsx redirects
      new visitors to /onboarding from ANY entry point, not just Home.
      **Infra caveat, not a code defect:** phone-OTP needs an SMS
      provider (e.g. Twilio) and Google needs an OAuth client, both
      configured in the Supabase dashboard — the Auth calls themselves
      are correct and complete, same category of gap as the sandbox's
      font-fetch block noted earlier.

## S05 — SEARCH ✅ DONE
- [x] `/search` page: empty state (recent/trending/shortcuts) — recent
      via localStorage (`lib/recent-searches.ts`), trending via a new
      `get_trending_searches()` RPC (aggregates `analytics_events`,
      migration 0010 — plain PostgREST can't express the needed
      GROUP BY), category shortcuts reusing the categories table
- [x] Typing state — autocomplete dropdown, parallel Supabase queries
      **moved server-side** (`/api/search` Route Handler) rather than
      client-side, learned from the Home page bundle-size lesson —
      Search page ships zero Supabase client code itself
- [x] Results state — tabbed (all/doctors/hospitals/symptoms), full
      query via the same `/api/search` route with a higher limit.
      **Filter sheet + sort dropdown NOT built here** — S05's spec
      explicitly reuses S06's Doctor List filter sheet for the
      "doctors" tab; building that once in S06 and having Search
      reuse it is the correct order, not a scope gap in this pass
- [x] No-results state — retry suggestions + WhatsApp fallback CTA
- [x] Voice search — `useVoiceSearch` hook wraps SpeechRecognition
      with the spec's bn-BD→bn-IN→en-IN language fallback chain, full
      overlay with listening/processing/error states
- [x] Bengali-English alias resolution (হার্ট→cardiology etc.) per spec

**Verification caveat, honestly noted:** the JSONB `ilike` filter
pattern (`name_translations->>bn.ilike.%q%`) used in `/api/search`
compiles and typechecks, and the equivalent raw SQL was confirmed
valid directly against the live database — but this sandbox can't
reach the Supabase REST API directly (not in the network allowlist),
so PostgREST's own parsing of that exact `.or()` filter string is
unverified end-to-end. Spot-check once real doctor/hospital data
exists (Admin Panel A05/A06, or manual test data).

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
- [~] Analytics event firing (`analytics_events` inserts) on every
      spec'd interaction (S07's event list, search, shares, etc.) —
      **`/api/analytics` Route Handler built** (pulled forward from
      here while building S04's Hero Slider, which needed it for
      ad_click tracking); wiring the *rest* of the spec'd events
      (doctor_view, call_click, share, search, etc.) happens as each
      of those screens gets built, not all at once here
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
