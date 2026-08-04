# CHECKPOINT.md — Vytanexa Session Handoff
**Read this file FIRST if you are a new Claude session picking up this
project. It exists specifically to let you continue from the exact
point work paused, without the original conversation.**

Last updated: this checkpoint, immediately after the user requested a
pause to document state (see §7 for why).

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
`f37febc` — "feat(web): S08 Hospital List (part 1/2) — SSR + infinite
scroll, type/emergency filters"

**Repo:** `github.com/juyel-dev/Vytanexa`, branch `main`, 45 commits.

**Live Supabase project:** "Vytanexa" (ref `lfrvzdhonsnemdfmxthw`),
region ap-southeast-2, Postgres 17. 39 tables, full RLS, migrations
0001-0010 applied and verified (see `packages/database/migrations/`
and `DATABASE-SCHEMA.md` Parts 1-7).

### What's fully done (verified: typecheck + build clean, committed, pushed)
- **Phase 0** — monorepo scaffold (apps/web, apps/admin, packages/config, packages/database)
- **Phase 1** — live Supabase wired, types generated, security/perf hardening
- **S01-S02** — design tokens, routing shell, BottomNav, TopBar variants
- **S03** — full onboarding (splash/language/slides/location/signin), `/auth/login`, `/auth/verify`
- **S04** — Home page, all 13 sections, admin-controlled section registry
- **S05** — Search (all 4 states, voice search, trending RPC)
- **S06** — Doctor List (SSR + infinite scroll, filter sheet, sort)
- **S07** — Doctor Profile (all 4 tabs, lead capture, reviews, share, SEO)
- **S08 part 1/2** — Hospital List (`/hospitals`) — SSR + infinite scroll + filters

### Uncommitted local work (exists in the sandbox filesystem right now, UNVERIFIED)
Two files were written but **never typechecked, never built, never
committed** — the session was paused specifically to write this
handoff before verifying/committing them:
```
apps/web/src/lib/queries/hospital-detail.ts       (new)
apps/web/src/components/hospital-profile/HospitalProfileClient.tsx  (new)
```
These implement the hospital detail page's data-fetching and UI
(gallery, info, services, linked doctors, sticky call/directions bar,
share sheet) — mirroring S07's doctor-detail pattern. **The route file
`apps/web/src/app/(main)/hospitals/[slug]/page.tsx` was NOT yet
created** — that's the missing piece that wires the above two files
together (see S07's `doctors/[slug]/page.tsx` as the exact template:
`getHospitalBySlug` instead of `getDoctorBySlug`, `generateMetadata`
with a `LocalBusiness`/`Hospital` JSON-LD instead of `Physician`).

**⚠️ If these two files aren't present when you resume:** the sandbox
container was reset again (this already happened once this session —
see §7). That's fine — they're small, quick to recreate following the
exact pattern in `lib/queries/doctor-detail.ts` +
`components/doctor-profile/DoctorProfileClient.tsx` (S07, already
committed, safe). Re-check with:
```bash
ls apps/web/src/lib/queries/hospital-detail.ts \
   apps/web/src/components/hospital-profile/HospitalProfileClient.tsx
```

## 3. EXACT NEXT STEP

1. Re-clone if the container was reset (see §7 for the exact commands
   — this is now a well-rehearsed recovery procedure).
2. Re-create `apps/web/.env.local` and `apps/admin/.env.local` (real
   values are in `PROJECT-CONTEXT.md` §4 — actually they are NOT
   written there for security; ask the user for fresh Supabase
   credentials if not already in your conversation context, or check
   if the previous session's values still work by testing a build).
3. Check whether the two uncommitted files from §2 above still exist.
   If yes: verify them (`npm run typecheck --workspace=apps/web`). If
   no: recreate them following S07's pattern.
4. Create `apps/web/src/app/(main)/hospitals/[slug]/page.tsx` (the
   missing piece — see S07's `doctors/[slug]/page.tsx` as the exact
   template to copy and adapt).
5. Run the full verification sequence (this project's established
   discipline, see §5 below): typecheck both apps, then full
   `next build` via the font-strip technique (see §6), then restore
   the real font code byte-for-byte, then re-typecheck.
6. Update `TODO.md` — check off S08, add any new findings.
7. Commit + push immediately.
8. Continue down `TODO.md` from S09 (Symptoms) onward.

---

## 4. KEY ARCHITECTURE DECISIONS MADE THIS SESSION (Not Yet in PROJECT-CONTEXT.md)

These were discovered/decided during implementation, not in the
original spec docs — future sessions should know them before
re-deriving or accidentally contradicting them:

```
✅ Two schema gaps found and fixed: `symptoms`/`symptom_categories`
   tables and `ads` table didn't exist despite the blueprint/admin
   spec depending on them. Added as migrations 0008/0009. Documented
   in DATABASE-SCHEMA.md Parts 6-7.

✅ @supabase/ssr must be >=0.12.x — the version originally pinned
   (^0.5.1) silently broke typed-client row inference with the newer
   Supabase type-generator output (__InternalSupabase key). Root-caused
   via isolated testing, not guessed.

✅ Heavy client components (EmergencyFAB, LocationPickerSheet) must be
   next/dynamic(..., {ssr:false})-loaded, and only MOUNTED when
   actually opened (not just prop-gated) — otherwise the browser
   Supabase client bundle blows the 150KB/route budget. Confirmed via
   measurement (175KB -> 108KB after fixing).

✅ All Supabase queries for pages/API routes go through the SERVER
   client (lib/supabase/server.ts), never the browser client, UNLESS
   the component is inherently interactive client-side (FAB, Location
   Picker, onboarding auth forms). Search, doctor list, hospital list
   all proxy through Route Handlers (/api/search, /api/doctors,
   /api/hospitals) specifically to keep Supabase client code off
   pages that don't strictly need client-side interactivity.

✅ Detail pages (doctor/hospital/symptom) hide the global BottomNav in
   favor of their own full-width sticky action bar, per S07's spec.
   Implemented via `components/layout/MainChrome.tsx` (pathname-aware,
   regex-matched against /doctors/[slug], /hospitals/[slug],
   /symptoms/[slug]) rather than restructuring route groups.

✅ Shared query-builder-function pattern: lib/queries/{entity}-list.ts
   and lib/queries/{entity}-detail.ts, one function used by BOTH the
   SSR page and the corresponding API route (or generateMetadata),
   so the two call sites can never drift out of sync. Established in
   S06/S07, continue this pattern for S08 detail, S09, etc.

✅ Reusable components built so far, use them rather than
   re-implementing: BottomSheet, ShareSheet (components/shared/),
   DoctorCard, HospitalCard (components/shared/), lib/i18n.ts
   (getLocalizedField — handles Json type from Supabase directly, no
   manual casting needed), lib/chamber-schedule.ts (schedule
   grouping + live status, pure functions).

✅ Two Zustand stores exist: stores/location-store.ts (persisted,
   shared between onboarding and the always-available Location Chip),
   stores/onboarding-store.ts (persisted, drives the onboarding step
   machine).

✅ Generic API routes already built and reusable: /api/analytics
   (fire-and-forget event logging), /api/leads, /api/reviews (both
   rate-limited via the DB's check_rate_limit() RPC), /api/search +
   /api/search/trending.
```

---

## 5. VERIFICATION DISCIPLINE (Established This Session — Follow It)

Every commit this session followed this sequence, and future sessions
should too:
```bash
# 1. Typecheck (fast, catches most issues)
rm -rf apps/web/.next && npm run typecheck --workspace=apps/web

# 2. Full build verification (see §6 for the font workaround)

# 3. Also typecheck/build apps/admin if anything in packages/* changed
npm run typecheck --workspace=apps/admin

# 4. Safety check before EVERY commit — never skip this:
git status --short | grep -iE "\.env\.local|node_modules" && echo "ABORT" || echo "clean"

# 5. Commit with a descriptive message (use a temp file + git commit -F
#    if the message contains backticks — see §7, this bit a shell
#    syntax error once already)

# 6. Push immediately: 
export GH_TOKEN="<fresh PAT from the user>" && \
  git push "https://${GH_TOKEN}@github.com/juyel-dev/Vytanexa.git" main -q && \
  unset GH_TOKEN
```

When something doesn't typecheck or build, **fix the real bug** — this
session found and fixed several real issues (not just noise): a
Supabase library version incompatibility, a PostgREST reverse-relation
typing gap, a missing Suspense boundary for useSearchParams, an
undefined Tailwind keyframe, an ambient SpeechRecognition type missing
a `length` property, a bundle-size regression. All were root-caused
and fixed properly, documented in the relevant commit messages — grep
`git log` for "real bug" / "real issue" to find them all if useful
context.

---

## 6. THE GOOGLE FONTS SANDBOX LIMITATION (Recurring, Expected)

This sandbox's network allowlist does not include
`fonts.googleapis.com`. `apps/web/src/app/layout.tsx` uses
`next/font/google` (Hind Siliguri, Noto Sans Bengali, Plus Jakarta
Sans) — correct, production-ready code that works fine on Vercel or
any machine with normal internet access, but `next build` cannot
complete in THIS sandbox because of that one blocked fetch.

**Workaround used all session, repeat it:**
```bash
cp apps/web/src/app/layout.tsx /tmp/layout.tsx.bak
# Temporarily replace with a version with no font imports (see any
# commit message this session for the exact stripped-down content)
rm -rf apps/web/.next && npm run build --workspace=apps/web
# Confirms EVERYTHING ELSE is correct
cp /tmp/layout.tsx.bak apps/web/src/app/layout.tsx
diff /tmp/layout.tsx.bak apps/web/src/app/layout.tsx && echo "restored exactly"
```
Never leave the stripped version committed — always restore the real
font code before committing. This is a sandbox artifact, not a code
defect — noted honestly in commit messages throughout rather than
silently worked around.

---

## 7. CONTAINER RESET — WHAT HAPPENED, WHAT TO DO

Mid-session, the sandbox container was reset (fresh filesystem, only a
few just-created files survived). **No work was actually lost** because
of the "commit + push immediately after every verified step" discipline
— recovery was just:
```bash
cd /home/claude && rm -rf Vytanexa && \
  export GH_TOKEN="<fresh PAT — ask the user, previous one may be
    revoked>" && \
  git clone "https://${GH_TOKEN}@github.com/juyel-dev/Vytanexa.git" && \
  unset GH_TOKEN
cd Vytanexa && git config user.email "dev@vytanexa.app" && \
  git config user.name "Vytanexa Dev"   # fresh clones need this set again
npm install
```
Then recreate `.env.local` files in both apps (values are sensitive,
not stored in the repo — get them fresh from the user or from
whatever's in your current conversation context) and continue.

**Lesson reinforced:** commit and push after every small, verified
unit of work — never accumulate more than one feature's worth of
uncommitted changes. This checkpoint itself exists because the user
correctly recognized reset risk mid-feature and asked to pause and
document rather than risk losing more in-progress context.

**Also learned:** a fresh `git clone` has no `user.email`/`user.name`
configured — the very first commit attempt after a re-clone will fail
with "Author identity unknown" until you set it (command above).

---

## 8. OPEN QUESTIONS / ASSUMPTIONS TO VALIDATE

- **JSONB `.or()` filter syntax** (used in `/api/search`,
  `lib/queries/doctor-list.ts`'s specialty filter) and the
  `categories!inner(...)` embedded-join filter pattern: both typecheck
  and match documented PostgREST syntax, but this sandbox cannot reach
  the live REST API directly (not in the network allowlist) to
  confirm end-to-end. **Spot-check both once real doctor/hospital/
  category data exists** — either via the Admin Panel (not yet built)
  or a manual test insert.
- **Phone-OTP and Google sign-in** (S03 onboarding, `/auth/login`):
  code is correct and complete, but needs an SMS provider (e.g.
  Twilio) and a Google OAuth client configured in the Supabase
  dashboard — neither is set up yet. Not testable until that
  infrastructure exists.
- **`doctors.degree` schema mismatch**: S07's Info tab spec shows
  structured "Degree — Institution (Year)" entries; the actual schema
  only has a flat text array. Rendered as-is (documented in
  `InfoTab.tsx` and `TODO.md`) rather than fabricating fields. If
  structured education history becomes a real product need, that's a
  schema migration, not a UI fix.
- **No real content exists yet** — every screen has been verified for
  correct empty-state handling (per the Production Data Rule — zero
  demo/seed data), but nothing has been visually verified with real
  doctors/hospitals/etc. because none exist. The Admin Panel (not yet
  started — see TODO.md) is what will let real data get entered.

---

## 9. WHAT HASN'T BEEN STARTED AT ALL

Per `TODO.md`, everything from S08-part-2 (hospital detail) onward:
S09 (Symptoms — needs the schema added this session), S10-S12 (Lab/
Blood/Emergency), S13-S15 (Community), S16-S18 (Account/Settings),
S19-S22 (Custom pages/Notifications/SEO/PWA), and the **entire Admin
Panel** (apps/admin currently has only the Phase 0 scaffold — a
placeholder page, no real screens from ADMIN-PANEL-SPEC.md A01-A15
have been built yet). See `TODO.md` for the exact ordered list —
follow it top to bottom, don't skip, verify before checking off,
commit after each item, per the user's standing instructions
(documented at the top and bottom of `TODO.md` itself).
