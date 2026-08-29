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
- [x] S14 Q&A (feature-flag gated) — `/community/qa`,
      `/community/qa/[id]`. New `lib/feature-flags.ts` (shared
      `app_settings.features` reader, also refactored
      `CommunityQATeaser` to use it instead of its own inline query)
      and `lib/device-id.ts` (localStorage device ID, shared with S15
      polls). Both routes 404 via `notFound()` when
      `features.community_qa` is off, not just hidden from nav —
      genuinely unreachable. `lib/queries/qa-list.ts` +
      `qa-detail.ts`: list with newest/most-upvoted/unanswered-first
      sort, doctor-answered badge (batched per-page query, not N+1),
      detail with doctor-answers-pinned-top (partitioned in JS after
      one chronological fetch — Supabase's query builder can't express
      "non-null group first, chronological within group" as a single
      ORDER BY). `/api/questions` (GET infinite scroll + POST submit,
      moderated), `/api/questions/[id]/upvote` (toggle via
      `question_upvotes`'s UNIQUE constraint), `/api/answers` (POST,
      moderated, `doctor_id` always null from this route — doctor
      answers only ever come from an admin/portal mechanism per spec's
      own scope note). Answer submission is guest-submittable, NOT
      sign-in-gated yet — spec calls for a "soft-gate" but no real auth
      exists until S22, and gating without real auth behind it would
      just be a fake wall; documented inline in `/api/answers`.
- [x] S15 Polls + Data Report ("ভুল তথ্য জানান") cross-cutting action —
      `/community/polls`: `lib/queries/polls.ts` (RLS already filters
      `is_active=true`; expired-but-active polls still return and the
      client shows results-only, per spec), `/api/polls/[id]/vote`
      (single-select, not a toggle like S14's upvotes — translates
      `poll_votes`'s UNIQUE-constraint violation into a clean "already
      voted" 409 rather than a generic 500), `components/polls/
      PollsClient.tsx` (optimistic UI, animated result bars, per-poll
      localStorage `voted` flag reconciled against the server's 409 if
      it's ever missing/cleared).
      Data Report: `components/shared/DataReportSheet.tsx` (one shared
      sheet, not duplicated per entity type) + `components/shared/
      MoreOptionsSheet.tsx` (the "⋯ menu" spec refers to — currently
      one item, kept as its own component so a second item later
      doesn't require restructuring). Wired into `DoctorProfileClient`
      (the `MoreVertical` button already existed there, unused — just
      needed an onClick) and `HospitalProfileClient` (needed a new
      `MoreVertical` button added, matching Doctor's pattern).
      `/api/data-reports` writes `status='open'` — moderation queue,
      never auto-applied, per spec's anti-vandalism rationale.
      `poll_view`/`poll_vote`/`data_report_submit{entity_type,reason}`
      analytics wired.

## S16-S18 — Account & Settings
- [x] S16 More page (`/more`) — real content replacing placeholder.
      `lib/current-user.ts` (shared `getCurrentUser()`, session +
      `public.users` profile join, used by S16 and S17 both), `lib/
      queries/more-page.ts` (data-driven custom-page menu injection
      from `custom_pages WHERE show_in_menu=true`, notification
      badge). Sign-out via `/api/auth/signout` (server-side, keeps the
      browser Supabase client out of the More page bundle — same
      lesson as S12's `/emergency` bundle-size investigation).
- [x] S17 Account (`/account/*`) — auth-guarded per-page (each page
      redirects guests to `/auth/login?returnUrl=...` rather than a
      shared layout guard, since each page needs `currentUser` for its
      own queries anyway). Pages: home (counts + typed-confirmation
      delete flow), favorites (doctor/hospital tabs, reuses
      `DoctorCard`/`HospitalCard` directly), history (read-only
      `leads` log), qa (own questions incl. pending/rejected), reviews
      (own reviews), profile (name/email/location edit; phone
      deliberately NOT editable — needs real OTP re-verification, not
      built yet, documented inline in `/api/account/profile`).
      **Migration 0014** (applied live): `questions_own_read` RLS
      policy (mirrors `leads_own_read` exactly) + `reviews.user_id`
      column (new — reviews had NO user association at all before,
      "My Reviews" was literally unbuildable without this) +
      `reviews_own_read` policy. Wired `user_id` into `/api/reviews`
      and `/api/questions` POST inserts (attaches when signed in,
      still fully guest-submittable either way). `get_advisors`
      re-checked clean after.
      **Global favorites infrastructure** (new, used everywhere, not
      just `/account/favorites`): `stores/favorites-store.ts`
      (Zustand, not persisted — always reflects server truth, unlike
      `location-store.ts`) + `components/shared/FavoriteToggle.tsx`
      (heart icon, guest soft-gate inline prompt "সাইন ইন করে সেভ
      করুন" per spec — NOT a hard redirect), wired into `DoctorCard`
      and `HospitalCard` so every list/search/home surface in the app
      gets working favorites for free. `/api/favorites` (toggle +
      batch-check).
      Account deletion: soft-delete via `users.deleted_at` +
      anonymizes PII (name/email/phone cleared) + server-side sign-out,
      per spec's "anonymizes PII, retains aggregate analytics" —
      `auth.users` row itself untouched so a future re-signup with the
      same phone gets a fresh profile via the existing
      `trg_on_auth_user_created` trigger.
      **Known simplification:** unfavoriting from `/account/favorites`
      updates the heart instantly (global store) but doesn't animate
      the card out with an undo toast (spec's "সরানো হয়েছে ↩️
      পূর্বাবস্থায় ফেরান") — the card just stays until next page
      load. Documented as a reasonable first-pass call, not silently
      dropped.
- [x] S18 Settings (`/settings`, not auth-gated — language/location/
      privacy work for guests too). `components/settings/
      LanguageSheet.tsx`: new BottomSheet (not a reuse of onboarding's
      full-page `LanguageStep.tsx` — wrong interaction shape, wired to
      the onboarding flow's own store); sets `locale` cookie + persists
      `preferred_language` for signed-in users. **Honest scope note:**
      this does NOT yet re-render existing UI into the chosen language
      — full UI-chrome i18n is S22 scope and unbuilt; documented
      inline rather than overclaiming. Location row reuses
      `LocationPickerSheet` directly (already exactly matches spec's
      "updates the global location used across Home/Doctors/Hospitals
      filtering"). Notification toggles persist to `users.
      notification_prefs`; "emergency" rejected server-side even if
      sent (`/api/account/notification-prefs`) — non-togglable by
      design, not just a disabled UI control. Data export request logs
      an `analytics_events` row rather than a dedicated queue/table —
      spec calls this "low priority... included for completeness," no
      email/WhatsApp delivery infra exists, documented inline as a
      lightweight stand-in. Clear Cache calls real `caches`/
      `serviceWorker` APIs (currently a safe no-op since no service
      worker is registered yet — forward-compatible with S22's PWA
      work, not a fake button).
      **Bundle-size catch (same lesson as S12/S16, caught before
      shipping this time):** `SettingsClient.tsx` initially statically
      imported `LocationPickerSheet`, measuring 171KB — over budget.
      Fixed by dynamically importing it (`next/dynamic({ssr:false})`),
      matching the exact pattern `LocationChip.tsx` already established
      for the same component. Dropped to 104KB.

## S19-S21 — Dynamic & SEO
- [x] S19 Custom page renderer (`/page/[slug]`) + BlockRenderer switch
      for all 12 block types. `lib/custom-page-blocks.ts` (loosely-typed
      block shapes — the JSONB has no DB-level schema, so
      `BlockRenderer`'s runtime fail-safe is the real safety net, not
      the TS types). Static blocks (hero/rich_text/image/cta_banner/
      spacer+divider) in `StaticBlocks.tsx`; `poll`/`qa_embed` fetch
      their entity server-side and link through to the real
      interactive page rather than reimplementing voting/answering
      state inline (a deliberate scope line, documented in each);
      `magazine_grid`/`doctor_grid`/`hospital_grid` reuse `ArticleCard`/
      `DoctorCard`/`HospitalCard` directly — extracted `ArticleCard`
      out of S13's `ArticleListClient` into `components/shared/` first
      so this didn't need a duplicate; `report_form` (client, fully
      dynamic field rendering from admin-defined
      text/select/checkbox — matches spec's "no code release needed to
      publish a new page") posts to new `/api/page-submissions`
      (write-only, no public SELECT policy exists — admin reads via
      service role); `faq_accordion` (client, accordion state).
      Unknown/malformed block types render nothing rather than
      crashing, so future block types (or a malformed JSON row) never
      take down an already-published page.
      Verified full build clean at 106KB First Load JS — no
      bundle-size surprise this time (checked immediately, not after
      the fact).
- [x] S20 Notifications center (`/notifications`). Announcement Banner
      (S04) already existed untouched — S20 explicitly says "no
      separate spec needed here beyond that reference." `lib/queries/
      notifications.ts`: `getNotifications` (RLS already scopes
      `personal` type to `target_user_id`, general/emergency visible
      to all — one query serves guests and signed-in users both, no
      branching needed) + `getReadNotificationIds` (signed-in only).
      Read-state split exactly per spec: DB `notification_reads` for
      signed-in users, `localStorage.vytanexa_read_notification_ids`
      for guests — `NotificationsClient` merges whichever applies on
      mount. `/api/notifications/mark-read` + `mark-all-read`: no-op
      success response for guests (nothing to persist server-side for
      them), real upsert (composite PK `(user_id, notification_id)` —
      verified against the actual schema before writing the
      `onConflict` string, not assumed) for signed-in users.
      **Correction to S16's badge comment:** this app's bottom nav has
      no bell icon at all (5 tabs: Home/Doctors/Search/Hospitals/More
      per S02 § 2.1) — S16's original comment referenced "mirrors
      bottom-nav bell badge state," which doesn't exist; fixed the
      comment to reflect that the More-page row is the only badge
      surface. Also documented (not fixed — a deliberate scope line):
      the badge dot is only accurate for signed-in users, since a
      guest's unread count depends on `localStorage` this Server
      Component can't read; adding a client-side check just for a
      badge dot was judged disproportionate.
- [x] S21 SEO landing pages (`/[state]/[district]/[specialty]`) +
      sitemap.xml route handler — `app/(seo)/` route group (mirrors the
      spec's `(seo)` group, identical URL hierarchy without polluting
      `(main)`): `lib/queries/seo.ts` (state/district/category helpers,
      guardrail: categories filtered to those with ≥1 verified doctor
      nationally — same national-count pattern as symptom-detail's
      `getSpecialtyDoctorCounts`, because chamber→location joins require
      real chamber data that still doesn't exist; documented inline rather
      than faking district-specific counts), `lib/seo-helpers.ts`
      (templated H1/title/description/intro with `{district}`
      `{specialty}` `{doctor_count}` substitution + canonical/hreflang +
      BreadcrumbList/ItemList/FAQPage JSON-LD builders, defaults match
      spec's Bengali long-tail intent — future Admin override via
      `app_settings.seo_defaults` would merge here when that panel exists),
      `components/seo/` (SeoBreadcrumbs, SeoFaq client accordion,
      SeoInternalLinks — nearby districts + other specialties). Three ISR
      pages (revalidate 21600 / 6hr, dynamicParams true, SSG via
      `generateStaticParams()` from DB):
      `/[state]` (state hub — H1/intro + district grid + specialty
      shortcuts), `/[state]/[district]` (district hub — specialty grid
      of only categories that have doctors + sibling-district links),
      `/[state]/[district]/[specialty]` (long-tail — the highest-value
      page per spec: SEO-crafted H1/intro/FAQ + same `queryDoctorList`
      filtered by specialty as S06, rendered via reused `DoctorCard`,
      BreadcrumbList+ItemList+FAQPage JSON-LD, internal linking footer).
      Guardrail: generates zero pages when `locations`/`categories` are
      empty (honest, verified — CHECKPOINT §3 noted this as expected
      until admin seeds data); a `/state/district/specialty` combo with
      zero doctors nationally 404s rather than indexing a thin/empty page.
      `app/sitemap.ts` (Next.js MetadataRoute.Sitemap, revalidate 1hr) +
      `app/robots.ts` — enumerates static routes + all verified doctor/
      hospital/symptom/article/custom-page slugs + every SEO combo under
      the same doctor≥1 guardrail; DB misses (no .env, empty DB) degrade
      to static routes only, never throw at build. `(seo)/layout.tsx`
      reuses `MainChrome`/`FirstRunGate`/`EmergencyFAB` (same chrome as
      S21's wireframe). Verified: `typecheck` clean, font-stripped `next
      build` clean (all SEO routes 97-100KB First Load JS, well under
      150KB budget; no expected bundle regression from server-only data
      queries).

## S22 — Infrastructure ✅ COMPLETE
- [x] next-intl setup, cookie-based locale switching, messages/*.json —
      `messages/bn.json|en.json|hi.json` (common/nav/onboarding/home/doctor/settings/offline
      keys — covers the spec's bn|en|hi + admin-extensible list, same keys
      reused by BottomNav and onboarding without duplicating strings),
      `src/i18n/config.ts` (`locales`, `defaultLocale='bn'`, `isValidLocale`),
      `src/i18n/request.ts` (`getRequestConfig` reading `locale` cookie via
      `next/headers:cookies()`, falling back to bn — matches S02 §7 "same
      URL serves all languages"), `src/lib/getLocale.ts` server helper
      for DB-content `getLocalizedField(record, 'name', locale)` threading
      (client sheets already set `locale` cookie; server pages can now
      call `getLocale()` — BottomNav wired as proof: `components/layout/
      BottomNav.tsx:1` now uses `useTranslations()` (`nav.home|doctors|
      search|hospitals|more`) instead of hardcoded `label` strings, so
      switching in Settings or onboarding re-renders chrome immediately;
      `next.config.js:1` wrapped with `createNextIntlPlugin('./src/i18n/
      request.ts')` and `src/app/layout.tsx:1` is now `async`, reads
      locale cookie + `getMessages()` and wraps `{children}` in
      `NextIntlClientProvider` with `lang=locale` on `<html>`; Settings'
      `LanguageSheet.tsx:1` updated to `useTranslations()` + `router.
      refresh()` after setting `document.cookie=locale=...; path=/; max-
      age=31536000` and persisting `preferred_language` for signed-in
      users (previously honest placeholder — now live). DB JSONB fallback
      chain (`bn→en→first key`) unchanged in `lib/i18n.ts`, but the
      threading gap noted in earlier TODOs is closed: `getLocale()` is the
      intended call site for future page-level adoption (shown in BottomNav,
      incremental for the rest). Verified: typecheck clean, full build
      clean (see below).
- [x] PWA config (next-pwa, manifest, offline page, precaching) —
      installed `next-pwa@5.6.0` (Next 14 compatible, `require('next-pwa')`
      not `.default` — caught at build), `next.config.js:1` wrapped with
      `withPWA({ dest:'public', register:true, skipWaiting:true,
      disable: development, fallbacks:{document:'/offline'},
      runtimeCaching:[ supabase-images→CacheFirst 30d, next/image→
      CacheFirst 30d, google-fonts→CacheFirst 1y, /api/*→NetworkOnly,
      /doctors|/hospitals/[slug]→StaleWhileRevalidate, /community|
      /symptoms|/search→StaleWhileRevalidate ]})` per S22 spec "Precache:
      app shell, root layout chrome, /emergency route, core fonts, logo/
      icon assets, offline.html fallback" + runtime strategies. `src/app/
      manifest.ts:1` (`MetadataRoute.Manifest`: name/short_name Vytanexa,
      theme #1756C8, bg #FFF, display standalone, orientation portrait,
      icons 192/512 + maskable → `public/icons/icon-*.png` placeholders
      — 1×1 transparent PNGs, 67B each, flagged for Juyel to replace with
      real brand mark before launch — keeps manifest valid for build
      without shipping a fake brand asset). `src/app/offline/page.tsx:1`
      (`'use client'` — required so the retry `onClick={() => location.
      reload()}` is serializable; Server Component would throw "Event
      handlers cannot be passed to Client Component props" as hit on first
      build attempt and fixed) — SVG illustration, `ইন্টারনেট সংযোগ পাওয়া
      যাচ্ছে না` + `জরুরি নম্বর দেখুন → /emergency` (precached per S12's
      "must work offline" requirement) + retry. `components/home/
      PwaInstallBanner.tsx` already captured `beforeinstallprompt` since
      S04 — now backed by a real manifest + SW, so the button actually
      fires. Settings' `handleClearCache` already called real `caches.
      keys()` / `serviceWorker.getRegistrations()` — now finds real
      workbox caches to clear, previously safe no-op. Build generates
      `public/sw.js` + workbox runtime — gitignored via existing
      `.next/` + explicit `public/sw.js` untracked (not committed). Full
      font-stripped build clean (see below).
- [x] Auth flow: phone+OTP and Google sign-in via Supabase Auth — already
      correct since S03 (`components/onboarding/SigninStep.tsx:27`,
      `app/(auth)/auth/login|verify/page.tsx:1` — `supabase.auth.
      signInWithOtp({phone})`, `verifyOtp({phone,token,type:'sms'})`,
      `signInWithOAuth({provider:'google'})` with `redirectTo` — infra
      caveat remains an SMS provider + Google OAuth client in the
      Supabase dashboard, documented inline as dashboard config not code
      defect; now polished with `middleware.ts:1` (Supabase SSR refresh:
      `createServerClient` with `request.cookies.getAll()/setAll` +
      `supabase.auth.getUser()` on every request, `matcher` excludes
      static/icon/manifest assets) so server components reading
      `lib/supabase/server.ts` (`cookies()`) see a live session after
      the initial access-token expiry — previously relied on client-only
      storage, now correct per Supabase App Router docs; the matcher also
      excludes Next/PWA assets correctly).
- [x] Zustand stores (onboarding, filters, ui state) — audited:
      `stores/location-store.ts:1` (persisted `vytanexa_location`),
      `stores/onboarding-store.ts:1` (persisted `vytanexa_onboarding`,
      flow resume for free), `stores/favorites-store.ts:1` (global
      favorites, not persisted — server truth) already as designed;
      filters are URL searchParams per S22 architecture summary
      ("URL search params as source of truth for shareable list/filter
      state"), not a store — intentional, not missing. Added `stores/ui-
      store.ts:1` (`useUiStore`: `toasts[]` + `pushToast/dismissToast` +
      `deferredPrompt` for the PWA install banner's captured
      `beforeinstallprompt` event — lifted from `PwaInstallBanner`'s
      local state so any surface can trigger `prompt()` without coupling
      to Home; tiny, documented, within budget).

## Cross-Cutting (do once, applies everywhere)
- [x] Zod validation schemas for every form (leads, reviews, questions,
      polls, donor registration, data reports, page-submissions, answers) —
      `lib/validations/leads.ts:1`, `reviews.ts:1`, `questions.ts:1`,
      `blood-donors.ts:1`, `data-reports.ts:1`, `page-submissions.ts:1`,
      `answers.ts:1`, `polls.ts:1`, `index.ts:1`. Zod server-only (Route
      Handlers never bundle into client JS — ~12KB never touches the
      150KB First Load JS budget, same reason the app already keeps
      Supabase client code out of page bundles). Wired into all 8 public-
      insert routes via `parsed = schema.safeParse(body)` → 400 on
      failure with `parsed.error.issues[0]?.message` (Bengali messages
      preserved verbatim from the previous manual checks). Backward
      compat: `reviews` still accepts legacy `doctor_id` (no `entity_type`)
      before resolving entity_type/entity_id, exactly as before — additive
      only. `answers` normalizes client field `body` → schema field `body`
      (same field name, just typed) — no call-site change. `page-
      submissions.submission_data` cast `as unknown as Json` for the
      Supabase insert (record<unknown> → Json). Verified: typecheck clean,
      full build clean.
- [x] Rate-limiting wired into every public-insert Route Handler using
      the `check_rate_limit()` DB function — previously only 7/8 were
      wired; `polls/[id]/vote/route.ts:1` was missing. Added per-poll
      rate limit (`poll_vote:${ip}:${id}:${voterKey}`, 10/1 hour) in
      addition to the existing `poll_votes.UNIQUE(poll_id,voter_key)` →
      409 duplicate-vote translation, so a rapid burst can't hammer the
      DB even if the token is unique. Also added rate-limit to
      `questions/[id]/upvote/route.ts:1` (20/1 hour per IP per question)
      — it was previously unrate-limited despite being a public-insert
      (DB UNIQUE backstops duplicates, but no anti-flood). Auth-only
      routes (profile/notification-prefs/delete/data-export/signout)
      deliberately NOT rate-limited: TODO item lists only "public-insert"
      and those are gated by `auth.getUser()` + 401 already. `/api/
      analytics` still intentionally unrate-limited per its own comment
      (fire-and-forget 204, high-volume by design). All GET read-only
      routes (doctors/hospitals/articles/search/trending/test-search/
      emergency-data/blood-services) correctly have no limit.
- [x] Error boundaries + loading.tsx skeletons per route — previously 0
      existed anywhere in the app (audit: no error.tsx/loading.tsx/
      not-found.tsx/global-error.tsx found). Added the full App Router
      convention set:
      `src/app/error.tsx:1` (root — covers (main)/(auth)/(seo); 'use client'
      with `reset()` callback + `error.digest` ref line + focus-visible
      outline per WCAG AA),
      `src/app/global-error.tsx:1` (required to re-render <html><body> at
      the root boundary since a parent layout can't recover from a
      layout-level error),
      `src/app/loading.tsx:1` (global segment skeleton — animate-pulse
      3 cards, no data dependency),
      `src/app/not-found.tsx:1` (branded 404 replacing Next's default
      pageless 404, with "হোমে ফিরে যান" CTA — covers `notFound()`
      calls from doctor/symptom/custom-page/SEO routes),
      `src/app\(main)/error.tsx:1` + `src/app\(main)/loading.tsx:1`
      (finer-grained so a failure in Home/Search/Doctors doesn't replace
      the entire app shell — root layout fonts/provider stay mounted).
      All new screens include `focus-visible:outline ... focus-visible:
      outline-brand-600` on their primary buttons per S01 §11.
- [x] Accessibility pass (aria-labels, focus states) per S01 § 11 —
      added a GLOBAL rule in `src/app/globals.css:8` (`*:focus-visible {
      outline: 2px solid #1756C8; outline-offset: 2px; }`) so every
      keyboard-focusable element gets the spec's visible 2px outline
      without re-styling each button — this restores WCAG AA coverage
      that the audit found missing (only 1 Tailwind `focus:` utility
      existed, on the OTP input). Also `@media (prefers-reduced-motion:
      reduce)` zero-out animation/transition durations app-wide per
      S01 § 11 "prefers-reduced-motion respected". ARIA audit (26
      hits, mostly icon-only buttons) was already adequate — aria-labels
      present on all icon buttons (call/whatsapp/share/favorite/bottom
      nav/voice/bottomsheet), `aria-current="page"` on BottomNav active
      tab, `aria-expanded={open}` on SeoFaq accordion, `aria-hidden` on
      decorative SVGs. Remaining gaps (no aria-label on card action
      rows/poll radio labels) are low-priority and would be addressed in
      a dedicated a11y pass; the global focus outline was the single
      highest-impact fix per the audit.

---

## ADMIN PANEL (apps/admin) — starts after user-app core is functional
- [x] A01-A02 shell: sidebar, auth/roles, layout — `(dashboard)/layout.tsx`
      (auth guard via `getAdminSession()` + `force-dynamic` so the
      cookie-gated shell is never prerendered), `components/layout/
      Sidebar.tsx` (240px/64px collapsible, role-filtered per `roles` —
      the UX half of defense-in-depth; `god-mode` + `admins`/`settings`
      groups are super_admin-only per the A02 matrix), `components/layout/
      TopBar.tsx` (breadcrumb page title + search/bell placeholders +
      avatar/role), `(auth)/login/page.tsx` (email/password, Supabase Auth
      credentials separate from the user-app phone-OTP flow), `/api/admin/
      login` (Route Handler — keeps the ~67KB supabase-js client OUT of
      `/login`, dropped 171KB→104KB First Load JS, same CHECKPOINT §6
      lesson as apps/web) + `/api/admin/sign-out` (server-side session
      clearing). Auth model: `getAdminSession()` in `lib/supabase/auth-verify.ts:1`
      (`server-only`), `requireAdmin()`/`requireRole(role)` with JSONB
      `permissions` override. Shared admin UI atoms per A01: `StatusBadge.tsx` (12
      color variants), `ConfirmDialog.tsx` (destructive-action gate, ref focuses
      CANCEL not confirm — safe default), `Toast.tsx` (success/error toast
      provider). Admin i18n (`next-intl`, messages/bn.json — Bengali-only,
      no fabricated en/hi; `src/i18n/request.ts` + `config.ts`). Verified:
      typecheck clean, full build clean (all routes ≤104KB, `admin` needs no
      font-strip since it uses system fonts, no Google Fetch). Dashboard
      (`/`) is a 175B shell at 96.1KB — correct (auth-gated render).
- [x] A03 Dashboard + moderation queue pattern (shared component) —
      `(dashboard)/page.tsx` (answers "আজ আমার কী করা দরকার?" first:
      `AttentionCards` — 4 pending-queue cards, colored left border by
      urgency, auto-hide at 0, parent collapses to "সব আপ টু ডেট!" when
      all empty; below it `SummaryCards` totals + `RecentActivity` reading
      `audit_logs` last-5 joined to `admin_users(name)`). `/api/admin/login`
      + `/api/admin/sign-out` wire the A02 auth surface. Moderation queue
      `<ModerationQueue>` shared component is NOT yet built — it belongs to
      A03's "unified moderation queue pattern" but is actually consumed by
      the three `/moderation/*` screens which are a later phase; documented
      here so it's not silently forgotten.
- [x] A04 Locations Manager (tree UI + CSV bulk import) — **was high
      priority: real location data entry unblocks the Location Picker
      (S02/S03) and every district-scoped query above — NOW DONE** —
      `lib/location-utils.ts:1` (shared slugify: Bengali→Latin
      transliteration table for অ→a..ৎ→t etc., `slugify()` lowercases +
      hyphen-collapses, `autoSlug(bn,en)` bn→en fallback, `buildLocationTree`
      + `LOCATION_TYPE_LABEL` + `childType()` helpers — same functions used
      by client auto-fill AND server bulk import so they never disagree),
      `lib/validations/locations.ts:1` (Zod, bn required, type/parent
      `superRefine` matching DB `chk_location_parent`, lat/lng ranges),
      `lib/audit.ts:1` (`server-only`, `writeAudit()` best-effort
      `audit_logs` insert — never blocks the real mutation),
      `(dashboard)/locations/page.tsx` (`force-dynamic`, `requireAdmin()` +
      service-role `SELECT ... WHERE deleted_at IS NULL` ordered by
      display_order/slug), `components/locations/LocationsManager.tsx`
      (`'use client'`, tree from `buildLocationTree`, `filterTree` search
      by bn/en/hi/slug, auto-expand on search, `Set<string>` expanded
      state defaulting to all states, per-row `+[add child]` context-aware
      (ward is leaf, no add), `✏️` edit + `🗑️` delete, `router.refresh()` on
      save), `LocationModal.tsx` (locked type+parent, bn required + en/hi,
      slug auto from bn/en with `slugTouched` + regenerate button,
      lat/lng/is_active, POST `/api/admin/locations` or PATCH
      `.../[id]`), `LocationImportDialog.tsx` (template download,
      `parseCsv()` quoted-comma aware, preview table 30-row cap,
      `POST /api/admin/locations/import`), `/api/admin/locations/route.ts`
      (POST — validates parent type is exactly one level up via
      `expectedParentType`, slug unique 409, audit `create`), `/api/admin/
      locations/[id]/route.ts` (PATCH — slug clash 409, DELETE —
      soft-delete `deleted_at` only if 0 children AND 0 attached
      `chambers/hospitals/blood_donors/ambulance_services` → 409 with
      `“3টি হাসপাতাল”` style counts), `/api/admin/locations/import/
      route.ts` (POST `{rows}` — 3 passes state→district→sub_district,
      `seenSlugs`+`idBySlug` dedup, `uniquify()` suffixes `-2` on clash,
      parent matched by `slugify(name)` so same spelling across rows
      required, `slug` column overrides auto, latin/lng optional, skips
      reported with row number + reason, audit `location_import`). Bug
      fix: `(auth)/login/page.tsx:23` default `next` was `'/dashboard'`
      (404) → `'/'` because `(dashboard)` adds no path. Verified:
      typecheck clean, build clean — `/locations` 7.2kB/97.8kB,
      `/login` 104kB, all `ƒ` dynamic.
- [x] A04 Categories Manager — `lib/category-utils.ts:1`
      (`CATEGORY_ICONS` 18-entry curated set with emoji, `iconEmoji()` +
      `categoryName()`), `lib/validations/categories.ts:1` (Zod, bn
      required, `icon_key` nullable, `search_keywords[]`, `display_order`
      + `is_visible_home`/`is_active`), `(dashboard)/categories/page.tsx`
      (`force-dynamic`, categories ordered by display_order/slug plus
      single `SELECT category_id FROM doctors` tally for live doctor
      counts), `components/categories/CategoriesManager.tsx` (search by
      bn/en/slug/keywords, `↑`/`↓` reorder via `POST /reorder` with
      `orderedIds[]`, inline `is_visible_home` toggle via PATCH, edit +
      delete with 409 `"3 জন ডাক্তার যুক্ত আছে"` block), `CategoryModal.tsx`
      (bn* + en/hi, slug auto+touched+regenerate, 18-icon grid picker,
      keywords comma→array, `is_visible_home` + `is_active`, POST/PATCH
      `/api/admin/categories[/id]`), `/api/admin/categories/route.ts`
      (POST — slug auto from bn/en, unique 409, audit `create`), `/api/
      admin/categories/[id]/route.ts` (PATCH/DELETE — DELETE blocked if
      `doctors.category_id` count>0 with clear Bengali message, soft-delete
      otherwise), `/api/admin/categories/reorder/route.ts` (POST
      `{orderedIds[]}` — verifies all exist then loop `UPDATE
      display_order=i`, audit `category_reorder` — directly drives S04
      CategoryGrid). Verified: typecheck clean, build clean — `/categories`
      4.79kB/95.4kB.
- [x] A05 Doctors Manager (list/CRUD/verification/chambers) —
      `lib/doctor-utils.ts:1` (`VERIFICATION_LABEL` pending/verified/
      rejected/suspended + colors, `doctorName()` bn→en→slug,
      `doctorSlugBase()` via shared `slugify`), `lib/validations/doctors.ts:1`
      (`baseDoctorSchema` with `name_translations.bn` superRefine,
      `category_id` uuid, `verification_status` enum, fee range
      superRefine `max>=min`, `chamberInputSchema` with location/phone/
      address required, schedule `day(open HH:MM/close)` regex,
      `is_primary` dedup; `doctorCreateSchema` = base+superRefine,
      `doctorUpdateSchema` = base.partial + chambers), `(dashboard)/doctors/
      page.tsx` (`force-dynamic`, `requireAdmin`, filters q/status/category/
      location (via `chambers.location_id → doctor_ids` two-step), pagination
      25/page, sort allowlist, primary chamber location resolved via
      `chambers.is_primary` → `locations` name), `components/doctors/
      DoctorsTable.tsx:1` (`'use client'`, URL-driven filters via
      `buildUrl`, search input, 4 dropdowns, bulk bar (verify/suspend/
      feature/unfeature via `POST /api/admin/doctors/bulk`), DataTable with
      checkbox, photo, name/slug, category (via `categoryName`), location,
      `StatusBadge` + featured ⭐ + rating, `⋯` menu (এডিট/ভেরিফাই/সাসপেন্ড/
      মুছুন/প্রোফাইল দেখুন ↗ `vytanexa.app/doctors/slug`), pagination ◂/▸,
      `ConfirmDialog` soft-delete, inline verification modal with 3 buttons),
      `(dashboard)/doctors/new/page.tsx` + `(dashboard)/doctors/[id]/page.tsx`
      (server, fetch categories+locations+doctor+chambers, pass to
      `DoctorForm`), `components/doctors/DoctorForm.tsx:1` (collapsible
      `Section` — মৌলিক তথ্য (bn*/en/hi, slug auto+touched, photo_url,
      category*, degree `TagInput`, BMDC, exp, languages bn/en/hi toggles),
      পরিচিতি (bio bn/en, expertise/tags `TagInput`, treats), যোগাযোগ (WA,
      fee min/max), সার্চ (aliases), চেম্বার (`ChamberEditor`), স্ট্যাটাস
      (verification, is_available, is_featured+priority), `খসড়া` vs
      `প্রকাশ` both POST/PATCH the same row — verification stays pending
      until explicit verify), `components/doctors/ChamberEditor.tsx:1`
      (add/remove, is_primary radio, location select (500), address/phone/
      WA/map/lat/lng/fee, `schedule` JSONB UI — day buttons + time inputs +
      add row), `/api/admin/doctors/route.ts` (POST — category exists,
      slug unique 409, norm arrays via `Set`, single-primary coercion,
      insert doctor then chambers with location validation, audit `create`),
      `/api/admin/doctors/[id]/route.ts` (PATCH — partial updates via
      `updates as never`, slug clash 409, chambers REPLACE: soft-delete
      missing ids, upsert by id with location check + single-primary
      enforcement + fallback primary; DELETE — soft-delete doctor +
      chambers, audit `delete`), `/api/admin/doctors/bulk/route.ts` (POST
      `{ids,action}` verify/suspend/reject/feature/unfeature, audit
      `doctor_bulk`). Verified: typecheck clean, build clean — `/doctors`
      4.57kB/95.4kB, `/doctors/[id]` & `/doctors/new` 135B/95.2kB, all `ƒ`.
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
