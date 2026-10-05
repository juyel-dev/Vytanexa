# Feature-by-feature audit log

Ongoing methodology (user-directed): pick one feature at a time, trace
its **entire network** — every component, query, route, shared piece,
and the admin-side management for it — and audit against: broken,
incomplete, scope gaps vs. spec, incorrect behavior, not visually
polished. Fix what's found, note what's deliberately deferred, move to
the next feature. Not a rewrite pass — a correctness/completeness pass
against `VYTANEXA-BLUEPRINT.md`'s own spec for each screen.

Read `VYTANEXA-BLUEPRINT.md`'s `## S0X —` section for the feature
before touching its code — the audit is "does the code match the
spec, and does the spec still make sense", not "what would I build
from scratch."

## Status

| # | Screen | Status |
|---|--------|--------|
| S01 | Brand system / design tokens | not audited |
| S02 | Information architecture / nav / routing | not audited |
| S03 | Splash · language · onboarding · location · sign-in | not audited |
| S04 | Home page | ✅ **done** — see below |
| S05 | Universal search | ✅ **done** — see below |
| S06 | Doctor list page | ✅ **done** — see below |
| S07 | Doctor profile page | ✅ **done** — see below |
| S08 | Hospital list · hospital detail | ✅ **done** — see below |
| S09 | Symptoms page · symptom detail · emergency flagging | ✅ **done** — see below |
| S10 | Lab & diagnostic tests | ✅ **done** — see below |
| S11 | Blood services page | ✅ **done** — see below (+ migration 0019) |
| S12 | Emergency system (FAB + full page) | ✅ **done** — see below |
| S13 | Health magazine · articles | ✅ **done** — see below |
| S14 | Q&A community | ✅ **done** — see below |
| S15 | Polls · reports · user submissions | ✅ **done** — see below |
| S16 | More page | ✅ **done** — see below |
| S17 | User account | ✅ **done (code)** — DB part needs owner approval, see below |
| S18 | Settings | ✅ **done** — see below |
| S19 | Custom pages / block builder | not audited (i18n-migrated only, batch 29) |
| S20 | Notifications center · announcement banner | not audited (i18n-migrated only, batch 33) |
| S21 | SEO landing pages | not audited — also Phase 3's deliberately-deferred i18n strand |
| S22 | Offline page · PWA · Next.js architecture · i18n | i18n-migrated (batch 25); architecture itself not audited |

## S18 — Settings (+ Location picker) — DONE

Fixed: (1) **language row showed a stale value** — frozen at first render (`setLanguage` was never called) so after switching language it kept the OLD name until a hard reload, and it read `profile.preferred_language`, which is always 'bn' for guests (same bug on the More page) — both now use the real resolved locale; (2) **location names stuck in the language they were picked in** — the store persisted only the localized string, so after switching language the chip / settings / more / emergency / onboarding kept the old-language district until re-picked; store now also keeps `name_translations`, `useLocationNames()` resolves them at render (old persisted state falls back to the string); (3) notification toggles reverted only on *network* failure — a 4xx/5xx left the switch showing a state the server never saved; also rapid taps overwrote each other from a stale closure — functional updates, per-key revert, error shown; (4) data-export button: network error = unhandled rejection with no feedback, rapid taps queued duplicates — try/catch, in-flight guard, error shown; (5) location picker: a failed query fell through to "no states yet" (outage reads as "your area isn't supported") — error + retry; (6) notification prefs now merged over defaults (a partial object showed ON-by-default toggles as OFF); language sheet re-syncs on open; locale cookie `SameSite=Lax`.
Verified OK: `locations` RLS already hides inactive/deleted rows; DB default for `notification_prefs` is full.
Flagged, not changed: "Clear cache" clears Cache Storage only (spec also says IndexedDB — the app uses none, so nothing to clear) and deliberately never unregisters the service worker; GPS auto-detect is documented-deferred; picker has no "back" step (close + reopen resets); version string `1.0.0` is hardcoded in two places.

## S17 — User account — DONE (code); account deletion needs a DB change awaiting approval

Fixed (code): (1) favorites/history/questions/reviews queries swallowed DB errors into empty lists (account home showed "0", favorites showed "no favorites" on a blip — reads as data loss) — now throw into the `(main)` error boundary; (2) `POST /api/account/delete` and `PATCH /api/account/profile` returned success when the UPDATE matched **zero rows** (RLS filters aren't errors) — deletion even signed the person out having changed nothing; now `.select('id')` + check; (3) data-export request inserted a new queue row on every tap — now 1 per 24h per user (repeat taps acknowledged); (4) delete dialog / profile save: network error left the button stuck forever + non-JSON error bodies threw; malformed JSON threw unhandled 500 on profile + notification-prefs routes; (5) account row counts forced Bengali digits on every language -> `Intl.NumberFormat(locale)`; avatar initial `Array.from`; input `maxLength` matches schema.
**NOT fixed — needs your approval (production DB change, I attempted it and it was not approved, so nothing was applied):** "delete account" is only a cosmetic soft-delete. It blanks `users.name/email/phone` + sets `deleted_at`, but leaves: the **auth user (the person can sign straight back in)**, their **blood-donor listing with phone number still public**, `questions.author_name/author_phone`, review/answer author names, favorites, analytics `user_id`. The schema is already built for a real delete (`public.users` cascades from `auth.users`; favorites/notification_reads cascade; content tables SET NULL; leads kept unlinked). Proposed fix = one `SECURITY DEFINER` function `delete_my_account()` (authenticated only): delete the donor row, scrub question/answer/review author fields + analytics `user_id`, then `DELETE FROM auth.users WHERE id = auth.uid()`; route calls it via RPC. Tell me "apply it" and I will (and test it in a rolled-back transaction first).
Flagged, not changed: profile page has no preferred-language shortcut (spec) and phone change/OTP re-verification flow isn't built (read-only by design); favorites list doesn't animate out/undo on unfavorite (documented simplification); `getCurrentUser` doesn't look at `deleted_at`; `/account/qa` and `/account/reviews` pages not read in this pass.

## S16 — More page — DONE

Fixed: (1) phone number was shown in full — spec says "masked phone" — now `+91•••••••••10`; (2) **failed sign-out looked like success**: the dialog closed and the page refreshed regardless of the result, and `/api/auth/signout` returned success even when `signOut()` errored (risky on shared phones) — route now 500s on error, client keeps the dialog open with an error; (3) admin sets a custom page's `menu_icon` as an **emoji** (Menu Manager previews it so) but the web ignored it and showed a generic globe on every custom page — now renders the emoji (Lucide keys still work); (4) notification red dot counted ALL active unread notifications while the Notifications page shows only the latest 50, so older unread rows left the dot stuck on with nothing to read — badge query now mirrors the page; (5) avatar initial used `charAt(0)` (breaks emoji/surrogate-pair names) — `Array.from`.
Flagged, not changed: `/page/support`, `/page/terms`, `/page/privacy` are hardcoded links — they 404 unless admin creates custom pages with exactly those slugs (verify in Admin); "Privacy" row and the Language/Location rows all go to `/settings`; guests never get a notification dot (documented scope line in `more-page.ts`); spec's 2-column compact-row grid isn't used (single-column rows).

## S15 — Polls · reports · submissions — DONE

Fixed: (1) **vote route accepted any `optionId`** — never checked it belongs to the poll in the URL, so a vote could land on another poll's option; also voted on missing/admin-deactivated polls (RLS hides them -> `poll` null was ignored, insert went ahead / 500) — now 404 for missing/inactive, 400 for a foreign option, non-UUID id is a clean 404, and the rate-limit slot is only consumed after those cheap checks; (2) `getActivePolls` swallowed errors into `[]` ("no polls right now" during an outage) — now throws, page shows error + retry; (3) poll vote client: network error / non-JSON body left `submitting` stuck (poll frozen), and a `localStorage` exception *after* a successful vote skipped the results reveal — try/catch + safe storage; (4) **`getDeviceId()` threw when storage is blocked** (Safari private mode / blocked cookies) which broke Q&A upvotes AND poll votes — now falls back to an in-memory id; (5) poll numbers forced Bengali digits on every language — now `Intl.NumberFormat(locale)`; (6) data-report sheet: network error left the button stuck, non-JSON error bodies threw, textarea `maxLength` = server limit; (7) `/api/data-reports` and `/api/page-submissions` threw unhandled 500 on malformed JSON; `page_submissions.submission_data` was **unbounded** (multi-MB blobs per request) — capped at 10 KB.
Flagged, not changed: poll vote rate-limit key includes `voterKey`, so a script can mint fresh keys and stuff ballots (spec accepts device-level dedup as non-security); tightening to per-IP would hit shared mobile NAT users — your call; data reports accept any UUID for `entity_id` (no existence check; limited to 10/day/IP); spec "or per-account if signed in" dedup and `poll_view`-per-poll not built; reports sheet is wired on Doctor + Hospital only (as spec).

## S14 — Q&A community — DONE

Fixed: (1) **upvote toggle silently removed votes** — `upvoted` started `false` on every load but the API toggles, so a returning voter tapping "agree" deleted their vote; now this device's votes persist in localStorage, the UI reconciles to the server's `{upvoted}` response, button disabled while in flight (double-tap), network errors revert instead of an unhandled rejection; (2) `/api/answers` and `/api/questions/[id]/upvote` ignored the `community_qa` flag (spec: whole module gated) — writes stayed open when admin disabled Q&A; (3) load-more 500/404 -> false "no more questions" (parsed `{}`) — now retry button, stale-filter guard, de-dupe; (4) no sort tiebreaker (most questions have upvote_count 0) -> duplicates/skips; upvoted sort now secondary `created_at`; (5) "✅ answered by verified doctor" badge was lost on every page after the first — API now returns `doctorAnsweredIds` per page; (6) `getQuestionById` turned DB errors into 404 (and non-UUID ids are now a clean 404 instead of a DB error); (7) malformed JSON bodies threw unhandled 500s (3 routes); concurrent double-vote (23505) showed a false error; invalid `filter`/`sort`/`page` validated; (8) Ask sheet / answer form: network error left the submit button stuck forever + non-JSON error bodies threw — fixed; input `maxLength` matches server limits; SSR list error -> error + retry; chips `replace` + `aria-pressed`.
Flagged, not changed: sort UI (newest / most-upvoted / unanswered-first) is spec'd but only filter chips exist (API supports `sort=upvoted`) — not adding; answer form isn't sign-in-gated (deferred to S22 by design); `getAnswers` failure shows "no answers yet" (could invite duplicate answers) ; spec analytics `question_submit` not added; shared `formatRelativeTimeBn` Bengali-only issue (see S13).

## S13 — Health magazine · articles — DONE

Fixed: (1) **infinite scroll froze for the rest of the visit** on any network error or 500 — `loadMore` had no try/catch/`res.ok`, `json.articles` undefined made the spread throw, `loadingMore` stayed true; now retry button, list kept, stale (old-category) responses dropped, de-dupe by id; (2) `published_at DESC` put published rows with NULL `published_at` FIRST (Postgres NULLS FIRST) — now `nullsFirst: false`, plus unique `id` tiebreaker (bulk-seeded equal timestamps reordered between pages); (3) `getArticleBySlug` turned any DB error into `notFound()` — with ISR (1hr) a real article could be cached as 404; now only PGRST116 is a 404; (4) SSR list error shown as "no articles" -> error + retry; `page` NaN/negative validated; (5) detail page showed Bengali digits in the read time on English/Hindi UI (`toBengaliDigits` + `readTimeSuffix`) — now the locale-aware `readTime` ICU key like the card (`readTimeSuffix` key now unused); (6) chips `router.push` -> `replace` (history spam), `aria-pressed`; hero images `priority`+`sizes`; analytics beacons `keepalive` (related-click fires right before navigation).
Verified OK: body HTML is sanitized with DOMPurify at admin write time (`apps/admin/src/lib/sanitize-html.ts`, both create + update routes). Flagged, not changed: web renders `body_html` as-is, so rows inserted by SQL/seed bypass that sanitizer — adding render-side sanitizing needs a new web dependency (`isomorphic-dompurify`); `formatRelativeTimeBn` is Bengali-only text even on English/Hindi UI (shared helper, used app-wide — needs a locale-aware replacement); spec analytics `article_share` not added.

## S08 — Hospital list & detail — DONE

Fixed: (1) no unique sort tiebreaker -> infinite scroll showed duplicates/skipped hospitals (added `order('id')` + client de-dupe); (2) invalid `?type=` hit Postgres as a bad enum value and NaN/negative `page` broke `.range()` — both shown as "no hospitals"; now validated centrally; (3) SSR error shown as "no hospitals found" -> error + retry; (4) load-more failure/500 shown as "no more hospitals" -> retry button, `hasMore` kept; stale load-more for an old filter guarded by query-key ref; (5) `getHospitalBySlug` **and `getDoctorBySlug` (S07 miss)** turned any DB error into `notFound()` — with ISR a real hospital/doctor page could be cached as 404; now only PGRST116 is a 404, other errors throw; (6) **JSON-LD XSS hardening across 9 pages** (hospital, doctor, symptom, article, 4 SEO pages): `JSON.stringify` inside `<script>` lets a `</script>` in admin-entered text break out — new `lib/json-ld.ts` `safeJsonLd()` escapes `<`/U+2028/9 (verified round-trips); (7) hardcoded English "✅ Verified" badge -> i18n `hospital.verifiedBadge` (bn/en/hi); (8) call-click beacon `keepalive`; filter chips `aria-pressed`.
Flagged, not changed: emergency hospitals dial `whatsapp_number ?? phone` from the main Call button (no separate emergency-phone column — confirm the WhatsApp number is a voice line); `?district=` deep link is dropped if the location store is empty (store is source of truth); sort by nearest/most reviews and facilities filter sheet are spec'd but unbuilt (not adding); analytics `directions_click`/`tab_view`/`share` not added.

## S11 — Blood services — DONE

Fixed: (1) `getBloodBanks`/`getBloodDonors` swallowed DB errors into `[]` — "no blood banks" during an outage; now throw, `/api/blood-services` returns 500, page/client show error + retry (`/api/emergency-data` catches separately so hospitals/ambulances still return); (2) a failed refetch (500 parsed as `{}`) **wiped every blood bank from the screen** — list is now kept and a retry banner shown; stale responses dropped by request id; (3) selecting a blood group hid every bank with *no* stock report for it — stock reporting is optional, so those banks (with their phone numbers) stay listed; only banks explicitly reporting that group "unavailable" are hidden; (4) on touch devices a donor-contact 429/404/503 navigated the person away to a raw JSON page — contact now goes through `?format=json` then `tel:` (number still never rendered as text); (5) analytics beacons fired just before navigation lacked `keepalive`; (6) blood-group chips got `aria-pressed`; `bloodGroup` API param validated.
**Follow-up (DB, migration 0019, applied live):** (7) **the donor list was always EMPTY for every signed-in user** — `public_blood_donors` is `security_invoker` but `blood_donors` blocks all SELECT (`USING (false)`); verified live: 4 donors exist, view returned 0. Now `list_blood_donors()` RPC (SECURITY DEFINER, authenticated-only, no phone, newest first by `created_at`); (8) donor registration consumed the 90-day per-phone slot before the INSERT — an insert failure locked the phone out for 90 days. Now `register_blood_donor()` RPC does listing-check -> rate-limit -> insert atomically (verified live: a failing insert leaves 0 rate events; second call -> `already_listed`). Server-side validation duplicated in the RPC since it bypasses RLS.
Not added: spec analytics `blood_page_view`, `blood_group_filter`, `donor_register_submit` (existing: `blood_bank_call_click`, `blood_donor_contact_reveal`, `blood_donor_registration`). Note: direct INSERT policy `authenticated_insert_own_donor` still allows bypassing the phone rate limit (bounded to 1 listing/account by the unique index) — consider dropping it now that the RPC exists.

## S10 — Lab & diagnostic tests — DONE

Fixed: (1) no stale-response guard — a slower old request could overwrite newer results (ref-id guard added); (2) fetch had no try/catch/`res.ok` — network error left "searching…" forever; DB errors were swallowed into `[]` ("no center offers this test") — `searchTests` now throws, API returns 500, UI shows error + retry; (3) `test_search` analytics fired server-side on every debounced keystroke ("cb", "cbc") — now logged once per settled query (1s stable, results loaded) via rate-limited `/api/analytics` (schema gained optional `location_id`); (4) user input unescaped inside PostgREST `or()` (`,` `)` `%` `_` altered the filter) — sanitized, `q` capped at 100 chars; (5) hospital ordering lacked tiebreaker. WhatsApp "জানান" CTA: reads admin-managed `app_settings.contact_whatsapp` (God Mode -> Footer).
Deferred: spec's district-wide "all diagnostic centers" fallback drops the district filter (link goes to `/hospitals?type=diagnostic`, S08).

## S05 — Universal search — DONE

Fixed: (1) **alias expansion was broken** — client glued `"হার্ট cardiology"` into ONE ILIKE pattern that matches nothing, making aliased searches worse; now aliases are sent as separate OR-ed stem terms (`alias=` params), matched by "contains"; (2) category matches shown in the dropdown were **dropped from the results page** (count/tab ignored `categories`, so "cardiology" showed "no results") — now listed under All and counted; (3) `search` analytics fired on every debounced keystroke (trending filled with "kar", "kard"…) — now only on submitted searches (`track=1`); spec's `search_select` on dropdown picks added; (4) API outage returned 200 + empty arrays ("no results") — now 500 when all 4 queries fail, client shows retry (dropdown + results); (5) `limit` unclamped (NaN / huge) and `q` uncapped — clamped 1–50 / 100 chars; (6) `useState(getRecentSearches())` read localStorage during render → hydration mismatch, moved to effect; (7) "জানান" WhatsApp CTA linked to bare `https://wa.me/` (dead-end) here and in Lab Tests (S10) — now reads `app_settings.contact_whatsapp` (admin-managed), CTA hidden if unset.
**Owner action:** set the WhatsApp number in Admin -> God Mode -> Footer (`app_settings.contact_whatsapp`); the CTA is hidden until it is set. (Read via `lib/support-contact.ts`.) Deferred: spec's results filter sheet / sort popover / Tests tab, no-result category fallback chips, voice `lang` (`bn-BD` in spec vs `bn-IN` convention) — VoiceSearchOverlay not audited.

## S06 — Doctor list — DONE

Fixed: (1) no unique sort tiebreaker -> infinite scroll showed duplicate doctors and skipped others on tied keys (added `order('id')` + client de-dupe); (2) SSR query error was shown as "no doctors found" — now an error state with retry; (3) load-more failure/500 was shown as "no more doctors" — now a retry button, `hasMore` kept; (4) slow load-more response for an old filter could append into a new filter's list — guarded by query-key ref; (5) NaN/invalid `feeMin`/`feeMax`/`rating`/`page` from URL reached PostgREST and errored — sanitized centrally in `queryDoctorList`; (6) multi-slug `?specialty=a,b` (from symptom CTA) highlighted only the first chip — now no misleading highlight.
Deferred (as documented in code): `district`, `availableToday`, sort by availability/nearest (need chamber data/geolocation); spec's native ad every 5th card and filter-sheet extras not audited.

## S09 — Symptoms — DONE

Fixed: (1) `queryAllSymptoms` / `getSymptomBySlug` swallowed DB errors into `[]` / `null`, so with ISR (6hr) a transient failure cached a blank list or a 404 for a valid symptom — now throw (only PGRST116 = real not-found); (2) `getSpecialtyDoctorCounts` showed "0" on error — now `null`, count hidden; (3) spec analytics `symptom_view`, `specialty_chip_click`, `cta_click` were missing — added.
**Follow-up done:** emergency banner now says 108 or 112 (108 = general emergency ambulance, 112 = national unified; 102 is mainly maternal/infant transport so not used here) with tap-to-call buttons (`emergency_call_click`). Still deferred: list groups by first specialty, not a symptom-category taxonomy (schema gap, see `symptom-list.ts`).

## S12 — Emergency System — DONE (commit `f7e6420`)

Full findings and fixes are in that commit's message
(`git show f7e6420`), not repeated here. Picked this feature
specifically for its safety-critical nature. Summary: **108 (the
alt-ambulance number many Indian states actually use) was completely
missing** from the national numbers list — spec calls for 8, code had
7, both the full page and the FAB sheet share the one array that was
wrong. **`/emergency` had zero offline service-worker precaching**
despite being spec's own explicit "the one page in the app that must
work offline" — every other page had a caching rule, this one didn't.
**Fetch failures were indistinguishable from genuinely-empty results**
in both the full page and the FAB's fast-path sheets — a network
error while offline showed the same "no hospitals found" message as a
real empty district, which is actively dangerous framing for a
panicking offline user. Fixed all three, plus three more stale
"not built yet" comments (same pattern as S04's audit) now that the
PWA precaching gap is closed.

## S04 — Home Page — DONE (commit `859606e`)

Full findings and fixes are in that commit's message
(`git show 859606e`), not repeated here. Summary: the single biggest
finding was that **the PWA install banner has been permanently dead
code since launch** — `next-pwa` and its runtime-caching strategy were
fully wired, all 3 icon sizes existed, but `public/manifest.json`
never existed and was never linked from `layout.tsx`, so
`beforeinstallprompt` could never fire. Fixed by adding the manifest
and wiring it in (plus a proper Next-14-style `viewport` export for
`themeColor`, replacing the deprecated in-`Metadata` field). Also
fixed: `TrendingHospitals` was missing 2 of 3 spec-required facility
pills (ICU/ambulance) despite the schema being explicitly documented
to drive them; the Footer was missing the spec-required version
number; `NativeAd` had zero impression/click tracking despite spec
requiring it and admin's `AdsManager.tsx` already computing CTR from
those exact events (same "admin already expects this event" pattern
as S07). Two stale comments were corrected (one falsely claimed the
location system didn't exist, one falsely claimed PWA infra didn't
exist) rather than left to mislead a future read. Two low-value gaps
were noted but deliberately not fixed this pass — see the commit
message for why.

## S07 — Doctor Profile — DONE (commit `2078e93`)

Full findings and fixes are in that commit's message
(`git show 2078e93`), not repeated here. Summary: the single biggest
finding was **zero analytics tracking anywhere in the page or its
shared components** (`ShareSheet`, `ReviewsTab`) despite the admin
panel's `AnalyticsDashboard.tsx` already querying for exactly these
event types — the admin dashboard has been silently showing 0 for
doctor/hospital views and call/WhatsApp clicks since it was built.
Fixed all 7 spec-required events. Also fixed a real functional gap
(Chambers tab's directions button had no lat/lng fallback, unlike the
identical hospital feature) and a spec-vs-code gap (hospital
affiliation cards missing the "location" field the spec calls for).

Because `ShareSheet`/`ReviewsTab` are shared with S08, fixing them
also gave hospital detail `share`/`review_submit` tracking, plus
`hospital_view` and the primary call button's `call_click` were added
directly to `HospitalProfileClient.tsx` while already in that file for
the ShareSheet prop change — **not** a full S08 audit, just what came
free from the shared-component fix. S08 still needs its own pass
(chambers-equivalent tabs, other CTAs, spec-vs-code check) when it's
next up.

## How to resume

Pick the next `not audited` row (order doesn't matter much — go by
what's most user-facing/highest-traffic first: S06 Doctor list, S17
Account, S08 Hospital detail (still owes its own full pass despite the
S07 benefit) are good next candidates given the pattern so far of
"admin/infra already expects an event/field/route that the frontend
never sent.") Read that
screen's `VYTANEXA-BLUEPRINT.md` section fully, then read every file
in its network end to end before changing anything — the value of this
pass comes from cross-referencing spec against real code, not from
skimming. Update this table's row to done with a one-line pointer to
the commit, same as S07 above — don't restate the findings here, the
commit message is the record.
