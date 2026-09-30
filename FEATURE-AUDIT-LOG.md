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
| S08 | Hospital list · hospital detail | partially benefited from S07's fixes (see below) — not independently audited |
| S09 | Symptoms page · symptom detail · emergency flagging | ✅ **done** — see below |
| S10 | Lab & diagnostic tests | not audited (i18n-migrated only, batch 23) |
| S11 | Blood services page | Phase C.3 (blood bank detail) + analytics gap fixed separately (see TODO.md) — not a full audit pass |
| S12 | Emergency system (FAB + full page) | ✅ **done** — see below |
| S13 | Health magazine · articles | not audited (i18n-migrated only, batch 26) |
| S14 | Q&A community | not audited (i18n-migrated only, batch 17/qa component) |
| S15 | Polls · reports · user submissions | not audited (i18n-migrated only, batch 32) |
| S16 | More page | not audited |
| S17 | User account | not audited |
| S18 | Settings | not audited (i18n-migrated only, batch 19) |
| S19 | Custom pages / block builder | not audited (i18n-migrated only, batch 29) |
| S20 | Notifications center · announcement banner | not audited (i18n-migrated only, batch 33) |
| S21 | SEO landing pages | not audited — also Phase 3's deliberately-deferred i18n strand |
| S22 | Offline page · PWA · Next.js architecture · i18n | i18n-migrated (batch 25); architecture itself not audited |

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
