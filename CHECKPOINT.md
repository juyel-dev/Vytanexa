# CHECKPOINT.md — Vytanexa Session Handoff
**Read this file FIRST if you are a new Claude session picking up this
project. It exists specifically to let you continue from the exact
point work paused, without the original conversation.**

Last updated: end of the session that completed S13 through S20
(Community, Account, Settings, Custom Pages, Notifications). Juyel
ended the session here deliberately — conversation context was ~60%
used, not because of any blocker — and asked for this file to be
brought fully up to date before starting a fresh chat.

---

## 1. WHAT TO READ, IN ORDER

1. **This file** — exact checkpoint, next step, session-specific gotchas
2. `PROJECT-CONTEXT.md` — durable project identity, architecture decisions, owner info
3. `TODO.md` — the full granular execution checklist (what's done, what's next, in order)
4. `IMPLEMENTATION-ROADMAP.md` — phase-level view (0-6)
5. The three spec docs (`VYTANEXA-BLUEPRINT.md`, `DATABASE-SCHEMA.md`,
   `ADMIN-PANEL-SPEC.md`) — only dip into these for the specific
   section you're implementing, they're too long to read end-to-end
   each session

---

## 2. EXACT CHECKPOINT

**Last verified, committed, and pushed state:** commit
`6cab144` — "feat(web): S20 Notifications Center COMPLETE"

**Repo:** `github.com/juyel-dev/Vytanexa`, branch `main`. Working tree
is clean at this commit — nothing uncommitted, nothing pending.

**Everything S01 through S20 is complete, typecheck-clean, full-build
verified, and pushed.** This is a genuine clean stopping point, not a
mid-task pause.

---

## 3. IMMEDIATE NEXT STEP

**S21 — SEO Landing Pages** (`VYTANEXA-BLUEPRINT.md`, search for
`## S21`). Not started at all — no files exist for it yet.

Read the full S21 section before starting. From memory, the shape is:
- URL hierarchy: `/[state]`, `/[state]/[district]`,
  `/[state]/[district]/[specialty]` — the third level is the highest-
  value long-tail SEO target (e.g. "কোচবিহারে হৃদরোগ বিশেষজ্ঞ ডাক্তার")
- `generateStaticParams()` from the DB (states × districts × active
  specialties with ≥1 doctor) — SSG at build time
- Content-rich, crawlable landing shell wrapping the same doctor-list
  experience (S06), not a separate feature — re-uses
  `queryDoctorList`/`DoctorCard` etc.
- Will also need `sitemap.xml` (a Route Handler, not a static file,
  per Next.js App Router convention) enumerating these generated pages
  plus the rest of the crawlable app (articles, doctor/hospital detail
  pages, symptoms, custom pages)

**Before writing any code for S21:**
1. Check Supabase connectivity first — see § 5 below, this has failed
   at the start of nearly every session so far.
2. Re-read the full S21 spec section in `VYTANEXA-BLUEPRINT.md` — don't
   rely on this summary, it's from memory and may be incomplete.
3. Check whether `locations` has any real district/state data yet
   (`SELECT count(*) FROM locations`) — if it's still empty (it was,
   last checked), `generateStaticParams()` will correctly generate zero
   pages, which is honest/correct behavior, not a bug to work around.

**After S21, continue in this order** (per the todo list Juyel asked
for at the start of this stretch — proceed through it without asking
again unless something genuinely blocks):
- S22 — Infrastructure: next-intl i18n setup, PWA (manifest, service
  worker, offline page, precaching), any Auth polish. This is the
  biggest remaining non-admin item — several earlier screens
  (Settings' language row, `/emergency`'s offline requirement, the
  Clear Cache button) have documented, honest placeholders waiting on
  this.
- Cross-cutting passes: Zod validation audit across all API routes
  (most currently do manual `if (!x) return 400` checks, not Zod —
  worth deciding whether to retrofit), rate-limit coverage audit,
  accessibility pass, error boundary audit.
- **Admin Panel** (`apps/admin`, spec in `ADMIN-PANEL-SPEC.md`, A01+)
  — a large separate phase, Phase 0 scaffold only so far. This is
  genuinely a second application; scope it deliberately when reached
  rather than assuming it's a quick add-on.

---

## 4. WHAT THIS SESSION BUILT (S13-S20 summary)

Full detail is in `TODO.md` under each numbered section — this is
just an index so you know where to look, not a substitute for reading
those entries.

- **S13 Articles** — list (featured card + grid, category chips,
  infinite scroll) + detail (rich HTML body, author byline,
  `MedicalWebPage` JSON-LD). Extracted `components/shared/ArticleCard.tsx`
  for reuse.
- **S14 Q&A Community** — feature-flag gated
  (`app_settings.features.community_qa`), genuinely 404s when off.
  Doctor-answers-pinned-top, upvoting, moderated submissions.
- **S15 Polls + Data Report** — single-select polls with optimistic
  voting; "ভুল তথ্য জানান" cross-cutting action wired into Doctor/
  Hospital detail pages via a shared sheet.
- **S16 More page** — real account-aware header, data-driven custom-
  page menu injection, sign-out.
- **S17 Account** — 6 pages (home/favorites/history/qa/reviews/profile).
  Built a genuinely global favorites system (heart toggle on every
  Doctor/Hospital card app-wide, not just the account page).
- **S18 Settings** — language/location/notifications/privacy, not
  auth-gated.
- **S19 Custom Page Renderer** — `/page/[slug]`, all 12 block types,
  fail-safe unknown-block handling.
- **S20 Notifications Center** — DB read-state for signed-in users,
  localStorage for guests, merged correctly.

### Database migrations applied this session (0011-0014)
All applied live via Supabase MCP, all mirrored to local `.sql` files
in `packages/database/migrations/`, all documented in
`DATABASE-SCHEMA.md` inline, `packages/database/types.ts` regenerated
after each:
- **0011** — `symptoms.common_causes_translations` +
  `when_to_see_doctor_translations` (deferred from an earlier session,
  resolved this session once Supabase came back online)
- **0012** — `get_donor_phone()` SECURITY DEFINER RPC (S11's donor
  phone-reveal — the originally-spec'd "service-role Route Handler"
  design was architecturally impossible given apps/web never holds
  the service-role key; this RPC is the real fix, same pattern as
  `is_admin()`)
- **0013** — pinned `search_path` on `get_donor_phone` (fixed a
  `get_advisors` WARN immediately after 0012)
- **0014** — `questions_own_read` RLS policy + `reviews.user_id`
  column + `reviews_own_read` RLS policy (S17's "My Questions"/"My
  Reviews" were literally unbuildable without these — reviews had no
  user association at all before)

---

## 5. SUPABASE CONNECTIVITY — CHECK THIS FIRST, EVERY SESSION

The Supabase project (`lfrvzdhonsnemdfmxthw`, free tier) **auto-pauses
on inactivity**. This has happened at the start of nearly every
session so far. It is normal, not a bug.

**Symptom:** `Supabase:list_migrations`, `Supabase:execute_sql`, etc.
time out with "Connection terminated due to connection timeout."

**Fix, every time:**
```
1. Supabase:get_project → check status field
2. If status is "INACTIVE" → Supabase:restore_project
3. Poll Supabase:get_project every ~20-30s until status is
   "ACTIVE_HEALTHY" (can take 1-3 minutes)
4. Then retry whatever Supabase call failed
```
Don't assume the connector itself is broken and give up — it almost
certainly just needs a restore.

---

## 6. HARD-WON LESSONS FROM THIS SESSION (read before writing client components)

### Bundle-size: the browser Supabase client is expensive (~60-70KB)
Hit this **three separate times** this session (S12's `/emergency`,
S16-adjacent, S18's `/settings`) before it stopped being a surprise.
The pattern that bites:

- `lib/supabase/client.ts`'s `createBrowserClient` (full supabase-js +
  auth-js + realtime-js + storage-js) costs ~60-70KB once actually
  imported into a page's client bundle.
- `EmergencyFAB` stays cheap on every page because it's dynamically
  imported (`next/dynamic({ssr:false})`) from the **shared root
  layout**, not from an individual page.
- The same `dynamic({ssr:false})` trick does **NOT** reliably save you
  at the page level — confirmed by direct measurement, not assumption:
  tried it on `/emergency`, tried `force-dynamic` rendering too,
  neither worked reliably. Also caught a **second** instance in
  `/settings`'s `SettingsClient.tsx`, which had accidentally used a
  **static** import of `LocationPickerSheet` instead of dynamic (typo
  of habit, not a new problem) — fixing that one import dropped it
  from 171KB to 104KB immediately, confirming dynamic import *can*
  work at the component level when actually applied correctly.
- **The reliable fix:** don't call the browser Supabase client
  directly from a page-critical client component at all. Fetch via a
  Route Handler instead (`/api/emergency-data` is the pattern — see
  that route's own comment for the full story). This matches how
  every other list page in the app already worked before this lesson
  was learned the hard way.

**Going forward:** any new client component that needs Supabase data
should default to fetching via a Route Handler, not
`createClient()` from `lib/supabase/client.ts` directly, unless
there's a specific reason (like `EmergencyFAB` and `LocationChip`,
which are layout-level and already proven cheap). **Always run the
full font-stripped `next build` and check the bundle size of any new
route before considering it done** — this is already the established
workflow (see §7 workflow below), don't skip it.

### A real, embarrassing mistake — and the value of not hiding it
While building S08/S10/S11 (hospitals, lab tests, blood services),
this session's earlier self wrote code comments claiming "no
location-selector exists anywhere in the app yet" and deferred real
district filtering on that basis. That claim was **false** — a
`LocationChip` + Zustand `location-store` already existed from earlier
foundational work, just hadn't been checked for. Discovered this while
building S12 (`/emergency`), which needed exactly that component.

What happened next matters: rather than quietly using the newly-
discovered component going forward and leaving the earlier false
claim sitting in three files, this session went back and (a) flagged
the mistake explicitly to Juyel, (b) retrofitted real district
filtering into all three affected pages in a dedicated follow-up pass
(see the "District Filtering Retrofit" TODO.md entry, between S12 and
S13), and (c) checked `doctor-list.ts`'s similar-looking deferral
before touching it too — and correctly found that one was a
**different, legitimate** reason (needs a `chambers` join, no real
chamber data exists yet to test against), not the same mistake. Left
it alone.

**The lesson for future sessions:** when a past comment/decision turns
out to be wrong, say so plainly and fix it if the fix is reasonably
scoped — don't paper over it, and don't over-correct by "fixing"
things that were actually fine for a different, valid reason. Check
before assuming a pattern repeats.

### Schema gaps get fixed via migration, not silently worked around
Recurring pattern this whole project: when a spec'd feature turns out
to need a DB change that doesn't exist yet (S09's `common_causes`,
S11's donor-phone RPC, S17's `reviews.user_id`), the response has
consistently been: apply a real migration via Supabase MCP, document
it inline in `DATABASE-SCHEMA.md` and the local `.sql` file, regenerate
types, re-check `get_advisors`. Not: fake the feature, leave it
silently broken, or build a workaround that avoids touching the DB.
Keep doing this — it's why the app actually works end-to-end rather
than accumulating fake-looking features.

---

## 7. ESTABLISHED WORKFLOW (unchanged, keep following it)

Per screen/feature:
1. Read the relevant spec section carefully (`VYTANEXA-BLUEPRINT.md`
   for user-app screens, `DATABASE-SCHEMA.md` for any schema question,
   `ADMIN-PANEL-SPEC.md` once that phase starts)
2. Check what already exists in the repo before building (view files,
   don't assume — this session's location-selector mistake happened
   from *not* checking)
3. Implement
4. `npm run typecheck --workspace=apps/web` (or `apps/admin` once that
   phase starts)
5. Full production build with fonts temporarily stripped from
   `apps/web/src/app/layout.tsx` (Google Fonts is network-blocked in
   this sandbox) → verify all new/changed routes are within the 150KB
   First Load JS budget → restore the real font code **byte-for-byte**
   (diff against a backup, don't just eyeball it) → re-typecheck
6. Check Supabase advisors (`get_advisors`, both `security` and
   `performance` types) after any migration — confirm no new
   ERROR/WARN findings beyond the pre-existing, already-accepted ones
7. Update `TODO.md` with honest, specific notes — what was built, what
   was deferred and why, any schema gap found and how it was resolved
   or why it wasn't
8. Commit with a detailed message (`git commit -F /tmp/commit_msg.txt`
   via heredoc, since messages often contain backticks) → push
   immediately (`git push "https://${GH_TOKEN}@github.com/juyel-dev/Vytanexa.git" main -q`,
   unset `GH_TOKEN` right after)

**Safety check before every commit:** `git status --short | grep -iE
"\.env\.local|node_modules"` — must return nothing. Never commit
secrets or node_modules.

**GitHub PAT:** provided fresh each session by Juyel (see uploaded
`github_PAT` file or ask if not present) — short-lived by design,
never assume an old one from a previous transcript still works.

---

## 8. THINGS THAT ARE INTENTIONALLY NOT BUILT (don't "fix" these without reading why)

- Real UI-chrome i18n (language switching actually changing rendered
  text) — infrastructure exists (locale cookie, `preferred_language`
  persists) but no page threads a resolved locale through
  `getLocalizedField()` calls yet. S22 scope. Documented in
  `components/settings/LanguageSheet.tsx`.
- PWA offline caching / service worker — S22 scope. `/emergency` and
  Settings' "Clear Cache" button are both already forward-compatible
  (real browser API calls, currently safe no-ops) but nothing is
  registered yet.
- Phone number change flow (re-verification via OTP) — `/account/
  profile` deliberately doesn't accept phone edits, documented inline
  in `/api/account/profile`.
- Answer submission "soft sign-in gate" (S14) — currently fully
  guest-submittable because gating without a real auth wall behind it
  would just be a fake UI barrier. Real auth exists (Supabase Auth,
  OTP-based, already wired for login/verify) but no page enforces a
  "soft" prompt-then-continue pattern yet.
- District filtering on `doctor-list.ts` — different, valid reason
  (needs a `chambers` join + real chamber data to test against), not
  the same gap that was fixed on hospitals/lab-tests/blood-services.
- Data export request (S18) — logs an `analytics_events` row, no real
  job queue or email/WhatsApp delivery. Spec itself calls this "low
  priority... included for completeness."

---

## 9. RESUMING WORK — QUICK START

```bash
mkdir -p /home/claude/work && cd /home/claude/work
git clone -q https://github.com/juyel-dev/Vytanexa.git && cd Vytanexa
npm install --silent
```
Then: check Supabase connectivity (§5), re-read the S21 spec section,
and continue per §3 above.
