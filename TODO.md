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

## S06 — DOCTOR LIST ✅ DONE
- [x] `/doctors` page: SSR first page (server component, good for SEO/
      slow connections) + client-side infinite scroll continuation via
      IntersectionObserver + `/api/doctors`
- [x] Filter sheet (specialty multi-select, fee range slider, rating,
      language) — reuses `BottomSheet`. **District and "available
      today" filters deferred** (documented in `lib/queries/doctor-
      list.ts` — both need real chamber data to filter against
      meaningfully; the query builder has the exact spot to add them)
- [x] Doctor card component — already built in S04, reused as-is here
      (proof the S04 investment in a shared component paid off)
- [x] Sort (rating/reviews/fee/experience), specialty chip row,
      result count — all URL-state-driven (shareable, back-button safe
      per spec)
- [x] One shared query builder (`lib/queries/doctor-list.ts`) used by
      BOTH the SSR page and the pagination API route, so they can
      never drift out of sync with each other

**Verification caveat, honestly noted:** the `categories!inner(...)`
embedded-join filter (`.in('categories.slug', slugs)`) typechecks and
follows standard PostgREST syntax for inner-join filtering, but like
the S05 JSONB filter, this sandbox can't reach the live REST API to
confirm PostgREST parses it exactly as expected — spot-check once
real doctor+category data exists.

## S07 — DOCTOR PROFILE ✅ DONE ★ most critical page ★
- [x] `/doctors/[slug]` route, ISR (revalidate 3600s per spec's "1 hour
      for profiles" — same honest cookies()-forces-dynamic caveat as
      Home, documented in the file rather than silently claimed)
- [x] Hero card, trust strip, sticky tab bar (client-side tab state,
      not a route change, per spec)
- [x] Tab 1 তথ্য (Info) — **schema note:** spec's mockup shows
      structured "Degree — Institution (Year)" entries, but
      `doctors.degree` is a flat text array with no institution/year
      fields; rendered as-is rather than fabricating data that
      doesn't exist in the schema
- [x] Tab 2 চেম্বার (Chambers) — built `lib/chamber-schedule.ts`:
      schedule grouping + live open/closed status as pure, reusable
      functions (also needed later for S06's "আজ উপলব্ধ" chip)
- [x] Tab 3 রিভিউ (Reviews) — list + distribution bars + submission
      modal (honeypot, 20-500 char validation) + `/api/reviews` with
      rate limiting via the shared `check_rate_limit()` DB function
- [x] Tab 4 হাসপাতাল (Hospital Affiliations)
- [x] Sticky bottom action bar — **required restructuring the (main)
      layout**: built `MainChrome.tsx` (pathname-aware) so detail
      pages hide the global BottomNav in favor of their own full-width
      bar, per spec ("Detail pages hide bottom nav, this bar takes its
      place") — a real architectural fix, not a workaround
- [x] Appointment Lead Capture sheet → `/api/leads`, same rate-limit
      pattern, direct call/WhatsApp always available alongside the
      form per spec (never gated behind it)
- [x] Share sheet (built generic — `components/shared/ShareSheet.tsx`,
      reusable by S08/S09 later) + OG meta (`generateMetadata`) +
      JSON-LD (`Physician` schema)

## S08 — HOSPITAL LIST/DETAIL ✅ COMPLETE
- [x] `/hospitals` list page — SSR + infinite scroll + type/emergency
      filters, committed (commit f37febc)
- [x] `/hospitals/[slug]` detail page — gallery (swipeable + lightbox),
      hero info block, tab bar (তথ্য/ডাক্তার/সেবা/রিভিউ), sticky
      call+directions bar, emergency visual treatment, `Hospital`
      JSON-LD. `lib/queries/hospital-detail.ts` (`getHospitalBySlug` +
      `getHospitalServices` — resolves `services[]` against
      `test_catalog` for Tab 3's category grouping).
      Side-effect refactor: generalized the doctor-only `ReviewsTab`
      + `/api/reviews` route into shared, `entityType`-generic
      versions (`components/shared/ReviewsTab.tsx`) instead of a
      near-duplicate for hospitals — matches the spec's own framing
      ("scoped to hospital_id instead of doctor_id"). S07 unaffected,
      re-typechecked clean after the change.
      Schema-gap notes (documented honestly in the components, not
      worked around): no per-hospital test pricing field → services
      always show "কল করুন" fallback; no `insurance_schemes` or
      "established year" columns → those spec mockup sections omitted.

## S09 — SYMPTOMS ✅ COMPLETE (with one noted deferred schema gap)
- [x] `/symptoms` list page — SSG/ISR 6hr, search-within-page (client-
      side, no round-trip), emergency section pinned top, general grid
      grouped by each symptom's first linked specialty
      (`lib/queries/symptom-list.ts` — see file for the schema-gap
      note: no true "symptom category" taxonomy column exists, spec's
      mockup grouping fabricated from the closest real data instead)
- [x] `/symptoms/[slug]` detail page — emergency banner (border +
      CTA to `/emergency`), description, related-specialty chips w/
      doctor counts (`getSpecialtyDoctorCounts` — NOT location-
      filtered, same deferral as `doctor-list.ts`'s district filter,
      documented inline), bottom CTA to `/doctors?specialty=...`.
      `MedicalSymptom` JSON-LD.
- [x] **RESOLVED (migration 0011):** `symptoms.common_causes_translations`
      and `symptoms.when_to_see_doctor_translations` (JSONB array-of-
      translation-object columns) added once the Supabase MCP
      connector came back online (project had auto-paused —
      `Supabase:restore_project` brought it back, not a connector
      bug). Types regenerated (`packages/database/types.ts`), wired
      into `SymptomDetailClient.tsx` via new `getLocalizedArray`
      helper (`lib/i18n.ts`) — both sections auto-hidden if empty per
      spec, same as before, just no longer permanently empty.
      `DATABASE-SCHEMA.md` updated to match live schema.

## S10-S12 — Health Services
- [x] S10 Lab/Diagnostic test search (`/health/lab-tests`) — search
      input (300ms debounce, min 2 chars) against `test_catalog`
      (name/canonical_key/aliases) resolved to verified hospitals via
      `services[] @> matched_keys` (`lib/queries/test-search.ts`,
      `/api/test-search` route, `test_search` analytics event).
      Popular-test chip grid for zero-typing search (spec's
      low-literacy UX note). `HospitalCard` extended with an optional
      `matchedTestLabel` prop (additive, S06/S08 call sites
      unaffected) for the "✅ এই টেস্ট পাওয়া যায়: X" confirmation line.
      No-results fallback: "সব ডায়াগনস্টিক সেন্টার দেখুন →" + WhatsApp
      CTA, same pattern as S05.
      Note: `test_catalog` has no admin-seeded rows yet in the live DB
      — verified the empty-state paths render correctly (popular chip
      grid says "টেস্টের তালিকা এখনো যোগ করা হয়নি", search always
      returns the no-results fallback until an admin populates it).
- [x] S11 Blood Services page (`/health/blood-services`) — blood group
      filter chips (8 + সবগুলো), blood bank cards (verified hospitals
      tagged `facility_tags @> {'blood_bank'}`, stock indicators
      freshness-gated to 48hrs, computed at query time per spec — no
      cron), donor list via `public_blood_donors` view (never the raw
      table), donor registration form (guest-submittable, rate-limited
      1/phone/90 days).
      **Architecture decision:** the spec's donor phone-reveal design
      ("resolved server-side via a protected Route Handler") turned out
      to be unbuildable as originally sketched — `blood_donors_service_
      only` RLS blocks ALL direct SELECT regardless of key, and
      apps/web deliberately never holds the service-role key (that
      lives in apps/admin only, per `lib/supabase/server.ts`'s own
      comment). Resolved with a narrowly-scoped SECURITY DEFINER RPC
      (`get_donor_phone`, migration 0012) — same pattern already
      established by `is_admin()` — rather than breaking the
      no-service-role-in-web-app rule. `get_advisors` flagged the new
      function for an unpinned `search_path`; fixed immediately
      (migration 0013). `DATABASE-SCHEMA.md` § 3.6 updated to match.
      District/location filtering (shown in spec's mockup) intentionally
      deferred at the time — see the CORRECTION note under S12 below;
      the claim that no location-selector existed was wrong.
- [x] S12 Emergency system — FAB (pre-existing from earlier foundational
      work, `layout/EmergencyFAB.tsx`) + new full `/emergency` page.
      **CORRECTION to S08/S10/S11's notes above:** while building this,
      found that a `LocationChip` + Zustand `location-store` already
      existed (`components/layout/LocationChip.tsx`,
      `stores/location-store.ts` — also from that same earlier
      foundational session). The S08/S10/S11 comments claiming "no
      location-selector component exists anywhere in the app yet" were
      factually wrong, not a considered trade-off — I just hadn't
      checked. `/emergency` is the first page to actually wire it up
      for real district filtering (hospitals + ambulances scoped by
      `location_id` when a district is selected). **Follow-up done
      same session:** S08/S10/S11's list pages retrofitted with real
      district filtering too — see the dedicated entry after this one.
      `/emergency` structure: `NationalNumbersSection.tsx` (hardcoded
      national numbers, zero Supabase dependency, renders before any
      network request resolves — the "must work offline" requirement),
      `EmergencyPageViewTracker.tsx` (tiny, just the page-view
      analytics event), `EmergencyDataSections.tsx` (Location Chip +
      nearby emergency hospitals/blood banks/ambulances).
      **Bundle-size lesson:** the first version called the browser
      Supabase client directly from `EmergencyDataSections` (matching
      `EmergencyFAB`'s existing pattern) and measured 171KB First Load
      JS — over the 150KB budget. Neither `next/dynamic({ssr:false})`
      nor `export const dynamic = 'force-dynamic'` fixed it (confirmed
      by direct measurement, not assumption) — the actual fix was a new
      `/api/emergency-data` Route Handler, matching how every other
      list page in this app already fetches (hospitals, doctors,
      lab-tests, blood-services). Dropped to 104KB. `EmergencyFAB`
      itself stays cheap because it's dynamically imported once from
      the shared `(main)/layout.tsx`, not from a page — a page-level
      import of the same heavy client doesn't get the same treatment.
      Added `emergency_call_click{number_type}` analytics to
      `EmergencyFAB`'s existing tel: links too, for consistency with
      the new page (S12's spec names this event explicitly).
      Offline service-worker precaching remains S22 PWA scope — this
      session only ensured the *shell* has no data dependency, which
      is the precondition for that later work, not a substitute for it.

## District Filtering Retrofit (S08/S10/S11) — ✅ COMPLETE
Same-session follow-up to S12's correction note above. Reused the
existing `LocationChip` + Zustand `location-store` (no new UI
component needed) across all three pages:
- **Hospitals (S08):** `hospital-list.ts` gained a `locationId` param
  (`.eq('location_id', ...)`). `HospitalListClient.tsx` renders
  `<LocationChip />` and syncs the store's `districtId` into the
  existing `?district=` URL param via the page's own `updateParam`
  mechanism (same one already used for `type`/`emergencyOnly`) — Next
  then re-runs the SSR page with the new searchParams and the
  component's existing prop-sync effect picks up the fresh results.
  No new fetch path needed; reused 100% of the existing infrastructure.
- **Lab Tests (S10):** `test-search.ts`'s `searchTests()` gained an
  optional `locationId` param. `/api/test-search` reads `?district=`.
  `LabTestsClient.tsx` renders `<LocationChip />`, includes `districtId`
  in the debounce effect's deps so changing district re-runs the
  current search without retyping.
- **Blood Services (S11):** `blood-services.ts`'s `getBloodBanks()` /
  `getBloodDonors()` both gained an optional `locationId` param. New
  `/api/blood-services` route (this page has no existing
  searchParams-driven refetch mechanism like hospitals does, so it
  needed its own route, mirroring `/api/emergency-data`).
  `BloodServicesClient.tsx` renders `<LocationChip />`; SSR still
  paints nationally first (server can't see the client's persisted
  district), then a `useEffect` refetches via the new route once a
  district is selected.
- **Doctors (S06) deliberately NOT touched:** checked `doctor-list.ts`
  first rather than assuming — its district deferral is a *different*,
  legitimate reason ("district filtering needs a chambers join
  (chambers.location_id) ... no meaningful chamber data exists yet to
  filter against"), not the "no selector exists" mistake made for the
  other three. Conflating the two would have been a real error.

Verified: typecheck clean, full build clean (hospitals 109KB, lab-tests
109KB, blood-services 105KB — all within the 150KB budget, modest
increases from adding LocationChip, no bundle regression), get_advisors
clean (no new DB objects, pure application-layer change).

## S13-S15 — Community
- [x] S13 Articles list + detail (`/community/articles`,
      `/community/articles/[slug]`) — `lib/queries/article-list.ts` +
      `article-detail.ts`, SSR+infinite-scroll list (featured card +
      2-col grid, category chips), SSG+ISR(1hr) detail with
      `MedicalWebPage` JSON-LD, author byline links to doctor profile
      when `author_doctor_id` is set. `body_html` rendered via
      `dangerouslySetInnerHTML` — sanitization is the Admin Panel's
      write-time responsibility per DATABASE-SCHEMA.md's own comment
      on that column; flagged inline in `article-detail.ts` for when
      that panel gets built. New `lib/i18n.ts` helpers:
      `formatRelativeTimeBn` (the "২ দিন আগে" meta line) and
      `toBengaliDigits`. `article_view`/`article_read_complete`
      (≥90% scroll)/`related_article_click` analytics wired.
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
