# DEEPDIVE-REFACTOR-PLAN.md
**Full end-to-end deep-dive — web ⇄ database ⇄ admin ⇄ database ⇄ web.**
No code written here on purpose (per instruction) — this is notes +
planning only. Every item below is either a direct read of the actual
file, or an automated sweep across the *entire* tree cross-checked
against `VYTANEXA-BLUEPRINT.md` (S01–S22) and `ADMIN-PANEL-SPEC.md`
(A01–A15) so nothing in the spec gets silently skipped.

**Methodology (so this is falsifiable, not vibes):** every public write
route, every RLS/SECURITY DEFINER function, every account/IDOR path,
and every list-page empty-state were opened and read directly. Every
one of the ~280 code files was swept with targeted greps (image usage,
`dangerouslySetInnerHTML`, `force-dynamic`, ISR `revalidate`, debounce,
a11y attributes, hardcoded colors, `console.*`, `any`, TODO markers,
loading/error boundaries) and cross-tabulated against the spec's S01–S22
/ A01–A15 checklist so a "missing file" shows up as a missing grep hit,
not a guess. Where a finding below says "confirmed", it means I traced
the actual data path end to end (e.g. theme colors: DB column → write
route → read route → **searched the entire web app for the read and
found none**).

---

## 0. HEADLINE FINDINGS (read these first)

### 🔴 H1 — God Mode "Theme Editor" does not actually do anything on the live site
`apps/admin/.../ThemeEditor.tsx` saves `app_settings.theme_colors` to
the DB, and its own UI copy tells the admin: *"প্রকাশ করলে
app_settings.theme_colors আপডেট হবে; user-app root layout CSS variable
হিসেবে ইনজেক্ট করে — পরবর্তী পেজ লোডে কার্যকর"* ("on publish this
updates the DB and the user-app root layout injects it as a CSS
variable, live on next page load").

I grepped `theme_colors` across the **entire** `apps/web` tree. Zero
hits outside the admin app. `apps/web/src/app/layout.tsx` only sets
font CSS variables — it never fetches `app_settings` at all. So:
- Admin changes the brand color, sees a success toast, "publish" works
  at the DB layer.
- The live user app is 100% unaffected — every color is still a
  build-time Tailwind class from `packages/config/design-tokens.js`.
- This isn't a bug that breaks something visibly — it's worse: it's a
  feature that *looks* fully functional (save succeeds, contrast
  checker works, swatches update) but silently does nothing. An admin
  would only discover this by comparing the live site before/after.

This is the single highest-value fix in this whole pass, because it's
not a code smell, it's a **shipped-but-nonfunctional feature with its
own UI lying about what it does** (unintentionally — the comment was
clearly written when the plan was to wire it, then the wiring step got
dropped).

### 🟡 H2 — DoctorCard's "কল করুন" (Call) button dials the WhatsApp number, not a phone number
`apps/web/src/components/shared/DoctorCard.tsx`:
```
href={`tel:${doctor.whatsapp_number ?? ''}`}
```
The `doctors` table has no doctor-level `phone` column — real phone
numbers live per-chamber (`chambers.phone`, confirmed in
`doctor-detail.ts`). The list-level card doesn't have chamber data
loaded, so whoever built this reused `whatsapp_number` for both the
WhatsApp deep link (correct) and the Call button (wrong field,
right idea). Two concrete symptoms:
- A doctor with a WhatsApp number that differs from their voice line
  gets a Call button that dials the wrong number.
- A doctor with **no** `whatsapp_number` at all (WhatsApp is opt-in
  per S06) gets a Call button rendering `tel:` — a dead link, and it
  still visually renders as a normal, tappable, non-disabled button.
This is the exact kind of "reads fine in review, breaks in the real
world" bug — worth a real product decision (see refactor plan §4.1).

### 🟡 H3 — No shared `<DataTable>` in the admin panel — 14 hand-rolled tables
Despite `TODO.md`'s own notes repeatedly saying "DataTable 6 cols…" for
practically every A-series screen, there is **no such component**.
`find apps/admin/src -iname "*DataTable*"` returns nothing. Every one
of these 14 files independently reimplements table markup, pagination
controls, and empty states:
`AdminsManager, AdsManager, AmbulanceManager, BloodManager,
CategoriesManager, MenuManager, LeadsManager, LocationsManager,
NotificationsManager, QaManager, SubscriptionsManager, ArticlesTable,
DoctorsTable, HospitalsTable`.
Consequence: any table-level UX fix (better empty state, consistent
pagination, sticky header, row density, keyboard nav) has to be
hand-applied 14 times and will drift. This is the biggest single
leverage point for the admin UI/UX ask in this message.

### 🟡 H4 — Admin panel has zero `loading.tsx` / `error.tsx` / `not-found.tsx`, anywhere
`apps/web` has global + `(main)`-scoped loading/error boundaries.
`apps/admin` — across all 33 `force-dynamic` dashboard routes and 58
total routes — has **none**. Every admin nav click on a slow query
(analytics, audit-log with joins, leads with 3 extra lookup queries)
shows a blank white flash instead of a skeleton, and any unhandled
server error in a Server Component produces Next's default unstyled
error screen instead of an on-brand one. Low effort, real polish win.

### 🟢 H5 — Confirmed still solid (re-verified this pass, not just re-read)
Search debounce, ISR revalidate windows (60s/1hr/6hr matching spec),
empty states on all 10 list-rendering client components, design-token
discipline (only 7 hardcoded hex values in each app, both traceable to
one-off brand assets), account-route IDOR safety, service-role
isolation. Not re-litigating these — see `TODO.md` Phase 7 for the
security-specific pass from the previous message.

---

## 1. DATA FLOW MAP — how a byte actually moves through this system

```
                     ┌─────────────────────────────────────────┐
                     │            Supabase Postgres             │
                     │  39 tables · RLS on 36 (+3 partition-    │
                     │  template children inherit parent RLS)   │
                     │  42 policies · 4 SECURITY DEFINER fns:    │
                     │  is_admin(), check_rate_limit(),          │
                     │  get_donor_phone(), get_trending_searches()│
                     └───────────────┬───────────┬──────────────┘
                        anon/authed  │           │ service_role
                        (RLS-scoped) │           │ (RLS bypass)
                     ┌───────────────▼──┐   ┌─────▼─────────────┐
                     │   apps/web        │   │   apps/admin       │
                     │   (public,        │   │   (operator-only,  │
                     │   anon key only)  │   │   service-role key)│
                     └───────────────────┘   └────────────────────┘
```

**Web → DB (read path):** Server Components call `lib/queries/*.ts`
(one query builder per entity, shared between SSR page + pagination
API route — good pattern, verified doctor-list/hospital-list both do
this). RLS gates every read to `is_published`/`verified`/`is_active`.

**Web → DB (write path):** 9 public write routes, all anon-key +
RLS-scoped + Zod + `check_rate_limit()`. Two privileged exceptions,
both SECURITY DEFINER for a documented reason: `get_donor_phone`
(reveals a phone RLS would otherwise never expose) and
`check_rate_limit` itself (needs to write to a table with zero public
policies).

**Admin → DB (every write):** `createServiceRoleClient()` +
`requireRole()` re-check + `writeAudit()` — this triple is present on
essentially every mutation route I opened (spot-checked ~15 of the 40
admin API routes, 100% hit rate on the pattern). This is genuinely
well-disciplined for a solo/AI-paired build.

**Admin → Web (the part that's supposed to close the loop, and
mostly does):**
- `app_settings.homepage_settings` → read by `lib/homepage-sections.ts`
  → **works**, confirmed section registry pattern.
- `app_settings.feature_flags` → read by `lib/feature-flags.ts` →
  **works** (Community Q&A teaser gating confirmed).
- `app_settings.footer_content` → read by `Footer.tsx` → **works**.
- `app_settings.theme_colors` → **does NOT reach the web app (H1)**.
- `app_settings.homepage_settings` custom menu (God Mode → Menu
  Manager) → need to verify `BottomNav.tsx` / `MoreOptionsSheet.tsx`
  actually read `custom_pages`-driven menu items vs. a hardcoded list
  — **flagged for next pass, not fully traced this round** (see §5,
  open item).

**Web → Admin (indirect, via DB):** leads, reviews, questions, blood
donor registrations, page-submissions, data-reports — all land in
tables the admin panel polls/lists. No realtime/websocket path exists
anywhere (`supabase.channel` / `realtime` — zero hits in a repo-wide
grep), so "নতুন লিড" in the admin Leads Inbox needs a manual refresh /
page reload. Worth a product decision, not a bug (see §4.3).

---

## 2. SCREEN-BY-SCREEN NOTES — apps/web (S01–S22)

Status legend: ✅ solid · 🟡 works, has a rough edge · 🔴 real gap found

- **S01 Design System** ✅ — tokens shared via `packages/config`,
  Bengali/English/Hindi font stack self-hosted (no Google Fonts
  runtime call, matches the sandbox font-block workaround already
  documented).
- **S02/S03 Shell + Onboarding** 🟡 — functionally complete (GPS
  auto-detect deliberately deferred, documented). Rough edge: 4 of 5
  onboarding step components total 418 lines and the whole
  onboarding+auth bundle sits at 156–162kB, over the 150kB S22 budget
  — see §4.2.
- **S04 Home** ✅ — all 13 sections real-query-driven, admin-orderable
  via `homepage_settings`. PWA install banner correctly inert pending
  S22 service-worker infra (self-documented, not faked).
- **S05 Search** ✅ — debounced (150ms-ish via `setTimeout`, confirmed
  in `search/page.tsx`), voice search with bn-BD→bn-IN→en-IN fallback,
  trending via RPC.
- **S06 Doctor List/Card** 🟡 — filter sheet + sort solid. **H2 bug**
  lives here (Call button). District/"available today" filters still
  deferred (self-documented, needs chamber data).
- **S07 Doctor Profile** — not deep-read this pass individually beyond
  the shared `DoctorCard`; flagged for next pass (§5).
- **S08–S12 Hospitals/Symptoms/Emergency/Blood/Lab-tests** ✅ — all
  have real empty states (verified via grep this pass), location
  filtering confirmed present (S12 correction genuinely landed).
- **S13 Articles** 🟡 — **the XSS-sanitization gap from the previous
  audit pass lives here** (`body_html` claimed-sanitized, isn't).
  ISR 1hr confirmed correct.
- **S14–S15 Q&A / Polls** ✅ — rate-limited, empty states present.
- **S16 Community** — not deep-read individually this pass.
- **S17 Account (profile/favorites/history/reviews/qa)** ✅ — IDOR-safe
  (re-verified), empty states present. Minor: `profile` PATCH route
  validates name/email by hand instead of a Zod schema like every
  other route in the app — inconsistent, not insecure (§4.4).
- **S18 Notifications** ✅ — `emergency` correctly non-togglable
  server-side, not just UI-disabled.
- **S19 Custom Pages** 🟡 — same sanitization gap as S13 applies to
  `content_html` rich_text blocks (`PageBuilder.tsx`, confirmed).
- **S20 Settings** — not deep-read individually this pass.
- **S21 SEO landing pages** (`(seo)/[state]/[district]/[specialty]`)
  ✅ — ISR 6hr, JSON-LD breadcrumbs/FAQ/ItemList present.
  Note: `(seo)` route group has no `error.tsx`/`loading.tsx` of its
  own (falls back to the global one) — probably fine given these are
  simple SSR pages, flagging for completeness only.
- **S22 Cross-cutting** 🟡 — bundle budget mostly met (87–111kB
  typical) except onboarding/auth (§4.2). Zustand stores (favorites,
  location, onboarding, ui) — not individually re-read this pass.

## 3. SCREEN-BY-SCREEN NOTES — apps/admin (A01–A15)

- **A01 Design System / A02 Auth+Shell** 🟡 — auth is genuinely
  defense-in-depth (login route membership check + layout-level
  `getAdminSession` + per-route `requireRole`). **No loading/error
  boundaries anywhere (H4)**. No app-level rate limit on
  `/api/admin/login` (logged in TODO.md Phase 7 already).
- **A03 Dashboard** — summary/attention cards, not deep-individually
  re-read this pass.
- **A04 Locations** ✅ — CSV import with quoted-comma parsing, 3-pass
  dedup, preview — solid for a bulk-data feature.
- **A05/A06 Doctors/Hospitals CRUD** 🟡 — functionally complete;
  raw `<img>` tags in `DoctorsTable.tsx`/`HospitalsTable.tsx` for
  thumbnail previews (fine at this size, but see H3 — a shared
  DataTable could standardize this too).
- **A07 God Mode (theme/footer/homepage/menu/flags)** 🔴 — **Theme is
  the H1 finding.** Footer and homepage-settings confirmed working
  end-to-end. Menu Manager → `BottomNav`/`MoreOptionsSheet` link not
  fully traced this pass (open item, §5).
- **A08 Articles/Categories** 🔴 — **XSS-sanitization gap (H-adjacent,
  same as S13/S19), and this is *where* the vulnerable data enters.**
  `ArticleForm.tsx` is explicitly labeled "MVP: textarea for HTML —
  RichTextEditor toolbar future scope" — so the plan was always to
  replace this; sanitization should land regardless of which editor
  UI wins.
- **A09 Custom Pages (Page Builder)** 🔴 — same gap, `content_html`
  block type.
- **A10 Q&A/Ambulance/Blood moderation** — not individually re-read.
- **A11 Polls + Notifications composer** ✅ — vote-lock (409 once
  votes exist) is a nice, correct touch.
- **A12 Subscriptions + Ads** ✅ — one-live-subscription-per-entity
  constraint enforced at both DB (`uq_subs_one_active`) and route
  layer. Ads perf stats (impressions/clicks/CTR) computed from
  `analytics_events` — fine at current scale, will need a materialized
  view or rollup table once ad volume grows (not urgent).
- **A13 Leads Inbox** ✅ — CSV export, doctor/chamber enrichment.
  No realtime — see data-flow-map note above.
- **A14 Admins/Roles + Audit Log** ✅ — self-lockout prevented,
  super_admin escalation checked, rollback on partial failure in the
  create-admin route (`auth.admin.createUser` + `admin_users` insert
  paired with rollback — good transactional hygiene for something
  that isn't in an actual DB transaction).
- **A15 Analytics + Settings** ✅ — 5 parallel counts + `Δ%` vs
  previous period, CSV export.

## 4. CROSS-CUTTING NOTES (things that show up in >1 screen)

### 4.1 — DoctorCard tel: bug (H2) needs a product decision, not just a fix
Three real options, needs your call before anyone touches code:
  (a) Add a real `doctors.phone` column (schema change) and stop
      overloading `whatsapp_number`.
  (b) Fetch primary-chamber phone alongside doctor-list queries and
      fall back to it.
  (c) If WhatsApp-only contact is actually the intended product
      behavior, hide the Call button entirely when `whatsapp_number`
      is null instead of rendering a dead `tel:` link.
  My read: (c) is the cheapest correct fix short-term; (a)/(b) is the
  "do it right" version if doctors are expected to have a real voice
  line distinct from WhatsApp.

### 4.2 — Bundle budget: onboarding + auth pages (156–162kB vs 150kB)
Root cause almost certainly `supabase-js` + `next-intl` both loading
on these routes per the existing self-diagnosis in TODO.md. Options:
  - Split `supabase.auth` calls (small surface) from the full
    `supabase-js` client via a lighter auth-only import if the SDK
    supports it.
  - Defer `next-intl` provider hydration on these specific routes if
    they're single-language-at-a-time by construction (onboarding's
    own `LanguageStep` sets the language — arguably next-intl's full
    client provider isn't needed until *after* language is chosen).
  - Or: accept it — these are the two lowest-traffic-repeat routes in
    the app (visited once per user, ever), so the budget miss matters
    far less here than on Home/Doctor-List. Recommend: deprioritize
    unless Lighthouse/CWV data says otherwise post-launch.

### 4.3 — No realtime anywhere
Confirmed via repo-wide grep: `supabase.channel`/`realtime` = 0 hits.
Every "live" surface (admin Leads Inbox, admin notification broadcasts,
audit log) is poll-on-navigation only. This is a reasonable MVP
tradeoff, not a defect — flagging so it's a conscious choice, not an
oversight, going into any future roadmap conversation.

### 4.4 — Validation inconsistency: some routes hand-roll checks instead of Zod
`api/account/profile/route.ts` validates `name`/`email` with inline
`if` statements instead of a `lib/validations/*.ts` Zod schema like
every other route in both apps. Not a security issue (still
IDOR-safe, still rejects bad input) — it's a consistency/maintenance
issue. Same treatment (extract a schema) would take minutes and
match the established pattern.

### 4.5 — Image optimization
Mostly good: 13 files correctly use `next/image` for real content
images (articles, hospitals, ads, hero banners). The 4 admin table
thumbnails and `DoctorCard`'s 72×72 avatar deliberately use raw
`<img>` with a documented eslint-disable reason each — that's a
correct, intentional call for small fixed-size thumbnails, not a gap.

### 4.6 — Accessibility
`aria-`/`role=` attributes appear in only 40 of ~280 files. Given this
is a consumer health app used by a broad population (including
possibly older users, per North Bengal → nationwide healthcare
context), this is worth a dedicated pass eventually — but it's a
*breadth* gap (not every interactive element needs aria, many are
self-describing via visible Bengali text) rather than confirmed
broken screen-reader flows. Recommend: not urgent pre-launch, real
item for post-launch hardening (see refactor plan P2).

### 4.7 — Admin: 33 routes forced `force-dynamic`
Reasonable given every admin page reads session-scoped data, but worth
noting explicitly: this means **zero caching benefit anywhere in the
admin panel**, ever. Fine for an internal tool at current scale; would
become a real cost only if admin traffic/data volume grows a lot
(analytics page pulling 5000 rows is the one place I'd watch first).

---

## 5. OPEN ITEMS — not fully traced this pass, name them so they don't get lost

- [ ] Trace Menu Manager (`god-mode/menu`) → `BottomNav.tsx` /
      `MoreOptionsSheet.tsx` end-to-end — does admin-configured custom
      menu actually render, or is this a second H1-style gap?
- [ ] S07 Doctor Profile, S16 Community hub, S20 Settings — not
      individually deep-read this pass (only touched via shared
      components/queries). Do a dedicated pass before considering the
      web app "fully" audited screen-by-screen.
- [ ] A03 Dashboard, A10 moderation screens — same, not individually
      opened this pass.
- [ ] Chamber-level phone data model (relates to H2) — confirm whether
      `chambers.phone` is meant to be the doctor's real contact number
      always, or genuinely per-location (a doctor with 3 chambers
      might have 3 different chamber phones — in which case the
      *card-level* Call button conceptually can't have one right
      answer, and option (c) in §4.1 is the only correct fix).
- [ ] Verify Vercel's actual `x-forwarded-for` overwrite behavior for
      this specific project (carried over from the security pass —
      affects how urgent H2-adjacent rate-limit hardening is).

---

## 6. REFACTOR PLAN — phased, prioritized

**P0 — Fix now, all are small, all are either "feature is a lie" or
"security surface that doesn't match its own documentation":**
1. Wire `app_settings.theme_colors` into `apps/web/src/app/layout.tsx`
   as actual CSS custom properties (H1) — or, if not launching with
   this feature, remove/hide the God Mode Theme Editor UI so it stops
   claiming to do something it doesn't. Silently-broken is worse than
   absent.
2. Sanitize `body_html`/`content_html` server-side on write
   (article + custom-page routes) — carried over from the security
   pass, re-confirmed as real this round (A08/A09, S13/S19).
3. DoctorCard Call button — ship option (c) from §4.1 (hide when no
   number) as the immediate fix; revisit (a)/(b) as a real product
   decision, not urgent to block on.

**P1 — Architecture leverage points (biggest UI/UX ROI per hour spent):**
4. Extract a shared `<DataTable>` primitive for apps/admin (H3) —
   columns/rows/pagination/empty-state/sort as props, migrate the 14
   existing hand-rolled tables onto it one at a time (small steps,
   your usual pattern — each migration is its own commit). This is
   the single highest-leverage move for "polish the admin UI" because
   every future table-UX improvement becomes a one-file change instead
   of 14.
5. Add `loading.tsx` + `error.tsx` (+ a branded `not-found.tsx`) at
   the `apps/admin/src/app/(dashboard)/` layout level (H4) — one pair
   of files covers all 33 dashboard routes at once via Next's
   layout-scoped boundary inheritance.
6. Consolidate `api/account/profile` onto a Zod schema (§4.4) — while
   touching validation, worth a quick repo-wide check that every
   remaining public/account route follows the same schema-file
   convention (likely already true everywhere else, this looked like
   the one outlier).

**P2 — Polish backlog, no urgency, batch these into a single "hardening
sprint" rather than trickling them in:**
7. Accessibility pass (§4.6) — start with the highest-traffic flows
   (Home, Doctor List, Doctor Profile, Emergency FAB) rather than
   trying to do all 280 files at once.
8. Onboarding/auth bundle size (§4.2) — only worth it if real CWV data
   post-launch shows it mattering; don't preemptively optimize a
   once-per-user route.
9. Ads stats rollup (materialized view) once ad volume actually grows
   — premature right now.

**P3 — Product decisions needed before any code, not engineering work:**
10. Realtime or not, for admin Leads/Notifications (§4.3)? Poll-on-nav
    is a reasonable permanent choice for an internal tool at this
    scale — flagging so it's chosen, not defaulted into.
11. Doctor phone data model (§4.1 / open item in §5) — affects both
    the Call button fix and any future "call this specific chamber"
    feature.

---

## 7. WHAT THIS DOCUMENT DELIBERATELY DID NOT DO
Per your instruction, zero code was written or changed — this is
notes + a plan only. `TODO.md` remains the execution checklist; once
you say go, P0/P1 items above should get their own TODO.md entries
(small-step style, one commit each) rather than being tackled as one
giant PR.
