# Claude Session Context — Vytanexa i18n Redesign

> Written for a specific, real constraint: the person I work with here is on
> a usage-limited Claude plan and resumes this work across many separate
> sessions — sometimes the same chat after a 5-6 hour gap, sometimes a
> brand-new chat with zero memory of what came before. This file exists so
> that **the repo itself, not conversation history, is the source of
> truth**. Read this file (and its two siblings,
> `I18N-ARCHITECTURE.md` / `I18N-IMPLEMENTATION-SPEC.md`) before doing
> anything else on this project in a new session.
>
> Two things live in this one file on purpose: (1) a **skill** — how to
> work on this specific repo, the standards and working style that were
> established and found to matter, not generic advice; and (2) a **live
> snapshot** of exactly where things stand right now. Section headers
> below use the person's own requested structure.

---

## How to work on this repo (the "skill" part — read this even if you skip everything else)

These are not generic best practices — every one of them is here because
skipping it caused a real problem earlier in this same effort, or because
the person explicitly asked for it. Follow them by default, not just when
reminded.

1. **Verify with real tools, not reasoning alone.** This repo has no CI.
   `npm install` at the repo root works (registry.npmjs.org is reachable)
   — do it, then use the real `npm run typecheck` (runs `tsc --noEmit` +
   the `i18n:check` completeness script in both workspaces) after every
   meaningful change, not just at the end of a session. Several real bugs
   in this effort (a Rules-of-Hooks violation, a `server-only`
   module-taint bug, a transitive client-bundling bug) were **not**
   caught by `tsc` — they needed manual import-graph tracing. `next
   build` cannot be run in this sandbox: Supabase credentials aren't
   available AND the Google Fonts fetch during the build's font-loading
   step is blocked by network restrictions, so it fails early for reasons
   unrelated to whatever you're checking. Don't attempt it expecting a
   clean signal; say so plainly if a real build-level check is needed and
   isn't possible here.
2. **Grep to confirm claims, don't assume from memory.** "This directory
   is done" should be followed by actually grepping it for the Bengali
   Unicode range before saying so. Several `git log` messages in this
   effort document a claim being *wrong* on first check and corrected —
   that's the expected workflow, not a failure state. State findings
   plainly, including your own mistakes.
3. **Small, reviewable, honestly-described commits — one logical batch
   each.** Not one mega-commit. Every commit message in this effort's
   history states what was migrated **and** what was found along the way
   (bugs, consolidations, design corrections), even when the finding
   reflects on an earlier commit's mistake. `git log --oneline
   046c9f7~1..HEAD` is the full history of this effort — read a few full
   messages (`git show <hash>`) to calibrate tone and depth before
   writing new ones, don't undershoot them.
4. **Before adding a translation key, grep for it first.** Several
   near-duplicate keys were found and consolidated mid-effort (`call`/
   `details` moved doctor→common; `yourName` moved reviews→common;
   spoken-language labels vs. UI-locale labels kept deliberately
   separate — see `I18N-IMPLEMENTATION-SPEC.md` § 11). Check
   `apps/web/messages/bn/*.json` for an existing key with the same
   English meaning before writing a new one.
5. **Real translations, not placeholders, in all three locales every
   time.** Every namespace addition in this effort has genuine bn/en/hi
   text, ICU plural categories where the target language needs them
   (Bengali/Hindi differ from English here), and `npm run i18n:check`
   passing (key-set parity) before moving on.
6. **The transitive client-bundling check, every time, no exceptions.**
   Before touching a component that has no `'use client'` of its own:
   `grep -rl "ComponentName" apps/web/src --include="*.tsx"` and check
   whether ANY importer has `'use client'`. If yes, that component is
   part of the client bundle regardless of its own missing directive, and
   anything it imports from `@/lib/i18n` (the server-only-tainted file)
   will break the build. This exact bug was found three separate times
   in this effort (`ArticleCard`/`DoctorCard`/`HospitalCard`/
   `ServicesTab` in batch 1) — it is not a one-off, check every time.
7. **Communication**: this person writes in mixed Bengali/English (not
   Banglish — real script, code-switched naturally). Match that in chat
   responses. Code, comments, and commit messages stay in English
   (matches the existing repo convention throughout). Keep chat responses
   concise relative to the size of the work — the work itself should
   speak through commits and verified results, not a long narrated
   play-by-play in chat.
8. **Session handoff**: at the end of any session (hitting a usage limit,
   or a natural stopping point), update the "Work State" section below
   before signing off, so the *next* read of this file — whenever and
   wherever it happens — is accurate. Treat this file as something that
   goes stale the moment it's not updated, not a one-time artifact.
9. **Nested `useT()` calls can silently lose type-checking as the message
   tree grows** — next-intl's `NamespaceKeys` type has a real union-size
   ceiling; `useT('namespace.subsection')` can fail to type-check once
   there are enough namespace files, even though the exact same pattern
   worked earlier with a smaller tree. Top-level single-segment calls
   (`useT('doctor')`) are unaffected. If `tsc` reports a `NamespaceKeys`
   union-truncation error (read the message — it lists "... N more ..."
   and is not a "key doesn't exist" complaint) for a nested namespace
   call, apply `useT('a.b' as Parameters<typeof useT>[0])` — don't
   restructure the namespace file to avoid nesting, that loses the
   organizational benefit for no real gain (`i18n:check` still catches
   missing/mismatched keys regardless). Full account in
   `I18N-IMPLEMENTATION-SPEC.md` § 6.

---

## Objective

Redesign Vytanexa's i18n system from scratch (the prior `next-intl` setup
was infrastructure without adoption — correctly wired, but ~99% of UI
text hardcoded and `getLocalizedField()` never received a real locale at
any of its ~40 call sites, always silently defaulting to `'bn'`). Full
rationale in `I18N-ARCHITECTURE.md`. Concrete API, namespace layout, and
the phased plan in `I18N-IMPLEMENTATION-SPEC.md`. This file tracks
*live* progress; those two are the stable design record — don't
duplicate design rationale here, link to it.

## Important Details

- **Market is India, not Bangladesh** — this was a real mistake made and
  corrected early in this effort (see `I18N-ARCHITECTURE.md` § 1's
  correction note). Currency `INR`, ICU locales `bn-IN`/`en-IN`/`hi-IN`.
  Never assume Bangladesh from the Bengali UI language alone again.
- Repo: `github.com/juyel-dev/Vytanexa`, single `main` branch, no CI, no
  test runner. A GitHub PAT is provided via
  `/mnt/project/Temporary_gh_PAT__repo_link` when working in a fresh
  Claude session on this project — clone with it, it's pre-authorized
  for direct push to `main` ("use this token without asking").
- Locales: `bn` (default), `en`, `hi` for `apps/web`; `bn`-only for
  `apps/admin` (deliberate — Bengali-speaking sole operator, documented
  in `apps/admin/src/i18n/config.ts`).
- The facade package is `@vytanexa/i18n` (`packages/i18n/`) — application
  code imports `@vytanexa/i18n/server` or `@vytanexa/i18n/client`, never
  `next-intl` directly, except in each app's `i18n/request.ts` and the
  one `getMessages()` call in each root `layout.tsx` (documented,
  intentional exceptions).
- `useLocalizedField()`/`useLocalizedArray()` are hooks that **return a
  function** (`const localize = useLocalizedField(); localize(x)`), not
  hooks that resolve a value directly — required for correctness with
  `.map()` (Rules of Hooks). Same shape as `useTranslations()` → `t()`.
  Get this wrong and it'll work in simple cases and break the moment
  someone uses it inside a list.

## Work State (update this section every session — see skill point 8)

**As of commit `53af381`** (last commit in this session). Progress:
67/126 web `.tsx` files still have hardcoded Bengali (baseline at the
start of Phase 3 was 105/126). Note: this count includes files whose
only remaining Bengali is inside JSDoc comments quoting spec text
(e.g. `components/qa/*`, `components/account/*` from earlier this
session) — see "Blocked" below, that's expected and correct, not a
miss. **This count also no longer reflects the true size of the
remaining work** — see "New this session" below re: `.ts`/`.tsx`
scope.

### Completed
- **Phase 1 — foundation**: `packages/i18n` facade, the core
  `getLocalizedField` locale-threading bug fix, namespace message file
  split, type-safe keys, `scripts/i18n-check.mjs`. Commit `046c9f7`.
- **Phase 2 — DB-content call-site migration**: all 40 `getLocalizedField`
  call sites; duplicate language-label consolidation; admin
  `SubscriptionsManager.tsx` fix. Commit `604d160`.
- **Phase 3, so far** — fully done, verified, real bn/en/hi text (not
  placeholders) in every case: `components/shared/*`, `components/layout/*`,
  `components/doctor-profile/*` (+ `hospital-profile/InfoTab.tsx`,
  migrated alongside it), `components/onboarding/*`,
  `components/blood-services/*` (new `blood` namespace),
  `components/qa/*` (new `qa` namespace),
  `components/account/*` (new `account` namespace),
  `components/home/*` — all 12 files, new structured `home` namespace,
  `app/(seo)/[state]/*` (all 3 route pages) + `components/seo/*` +
  **`lib/seo-helpers.ts`** (new `seo` namespace — see below, this one
  matters more than its file count suggests). Commits `f5187d8` through
  `53af381` — see `git log --oneline 046c9f7~1..HEAD` for the full list;
  each message documents what was migrated *and* what bug or design
  issue was found along the way, several are worth reading in full
  (`git show <hash>`) before resuming, not just skimming the one-liners.

### Active
Nothing mid-edit. Session ended at a clean, committed, typechecked,
pushed state (same as every prior session in this effort).

### Blocked
Same two standing, non-blocking limitations as before (see prior
snapshot in git history for this file if needed) — `next build` can't be
verified in this sandbox; no ESLint config exists in the repo.

`useT()` nested-namespace calls checked against the § 6 `NamespaceKeys`
union-truncation note across two sessions running now
(`blood.registration` last session, `qa.ask` this session) — `tsc`
stayed clean both times, no cast needed either time. Still worth
reading § 6 before the *next* one, but this pattern is looking solid
in practice, not just in theory.

Confirmed via grep this session (`grep -rn "bn-BD" apps/web/src`) that
within `apps/web`, no further stray `toLocaleDateString('bn-BD')`
occurrences remain — the only two hits left there are legitimate
(`useVoiceSearch.ts`'s speech-recognition locale fallback list, unrelated
to number/date formatting, and `i18n-shared.ts`'s comment documenting the
original fix). That bug class is closed out **for apps/web**.

**Not closed out, and out of scope for this Phase 3 effort so flagging
rather than fixing**: the same `grep -rn "bn-BD"` against `apps/admin/src`
turns up **23 occurrences** across ~15 files (`ReviewsQueue.tsx`,
`ReportsQueue.tsx`, `QuestionsQueue.tsx`, `AdminsManager.tsx`,
`ArticlesTable.tsx`, `PagesList.tsx`, `AuditLogViewer.tsx`,
`QaManager.tsx`, `NotificationsManager.tsx`, `LeadsManager.tsx`,
`PollsList.tsx`, `RecentActivity.tsx`, `SubscriptionsManager.tsx`,
`BloodManager.tsx`, `AnalyticsDashboard.tsx`) — all `toLocaleDateString`/
`toLocaleString`/`toLocaleString` (numbers) calls hardcoded to `'bn-BD'`.
Admin is bn-only (single-locale, no next-intl facade wired up per this
project's i18n architecture docs), so this isn't a translation gap the
way it is in `apps/web` — it's the same underlying locale-tag mistake
(Bangladesh vs India Bengali number/date conventions), just never
routed through a shared formatter to begin with. Worth its own pass —
likely a small shared `formatBn()` helper in `apps/admin/src/lib/`
mirroring what `apps/web`'s facade already does — but that's a distinct
piece of work from "migrate hardcoded Bengali .tsx strings" and
shouldn't be folded into a Phase 3 batch without discussing scope first.

**New this session, important for whoever picks this up next**: this
whole Phase 3 effort's inventory command (`I18N-IMPLEMENTATION-SPEC.md`
§ 12) only globs `.tsx` files. `seo-helpers.ts` this session proved
that's a real blind spot — it held ~860 bytes of hardcoded Bengali (the
entire SEO title/h1/description/FAQ template system) and was invisible
to every inventory run so far because it's a `.ts` file. Re-running the
same scan against `src/**/*.ts` (excluding `.d.ts`) at the end of this
session turns up **33 more files, none touched yet**, mostly two
categories: API route handlers under `app/api/**/route.ts` (error
messages returned in JSON responses — `blood-donors/route.ts` alone has
188 chars) and `lib/validations/*.ts` (Zod schema `.min()`/`.max()`/
`.refine()` error messages — `validations/reviews.ts`,
`validations/blood-donors.ts`, `validations/questions.ts` are the
biggest). **Have not started this yet** — it's a different shape of
work than the component batches so far (these are server-side error
strings, not rendered UI text, so the migration pattern needs figuring
out fresh: does `getT()` work correctly called from inside a route
handler outside any component tree? do validation `.refine()` callbacks
run in a context where `await getT()` is even available, given Zod
schemas are typically built at module load time, not per-request?)
before committing to a batch rhythm for it. Flagging for a scoping
conversation rather than just diving in, same as the `apps/admin`
`bn-BD` finding.

### Next Move
Two clearly separate strands now, worth discussing with the user before
picking one:

1. **Continue the original strand** — remaining `.tsx` component/page
   directories, same 7-step checklist, same rhythm that's worked for 12
   batches running. Re-run the inventory command in
   `I18N-IMPLEMENTATION-SPEC.md` § 12 for current numbers; as of this
   session's end, in descending priority order: `app/(main)/account/`
   (491 chars, route pages — distinct from `components/account/*`,
   already done), `emergency/` (398), `more/` (343),
   `app/(main)/community/` (338), `app/(main)/search/` (326),
   `settings/` (291), `doctors/` (284), `app/(auth)/auth/` (254),
   `symptoms/` (241), `app/(main)/health/` (195), `hospital-profile/`
   (remaining files beyond `InfoTab.tsx`), `lab-tests/`, `polls/`,
   `articles/`, `custom-page/*`.

2. **New strand, needs scoping first** — the 33 `.ts` files above
   (API routes + Zod validations). Before batching these, figure out:
   the right pattern for getting a translator into a route handler
   (`getT()` should work fine there, it's still server-side Next.js, but
   confirm) and into Zod `.refine()`/`.superRefine()` callbacks
   specifically (may need the schema itself to become a function that
   takes `t` and returns a `ZodSchema`, built fresh per-request, rather
   than the current module-level constant — a real shape change to how
   these files are structured, not just a string swap). Worth raising
   with the user which strand to prioritize, since strand 2 changes the
   validation architecture and shouldn't be rushed into 33 files without
   settling the pattern on one first.

## Relevant Files

- `I18N-ARCHITECTURE.md` — why this design, trade-offs, what it enables.
- `I18N-IMPLEMENTATION-SPEC.md` — concrete API, namespace conventions,
  § 12 is the live phased checklist (this file's Work State section is a
  snapshot of it at a point in time; § 12 itself should also stay current).
- `packages/i18n/src/` — the facade: `types.ts`, `resolve-field.ts`
  (pure fallback logic), `format.ts` (Intl-based formatting), `server.ts`,
  `client.tsx`.
- `apps/web/src/lib/i18n.ts` / `i18n-client.ts` / `i18n-shared.ts` —
  web app's thin bindings (server / client / environment-agnostic pure
  helpers respectively — the three-way split exists specifically to avoid
  the `server-only` taint bug, don't collapse them back into one file).
- `apps/web/src/i18n/config.ts` / `request.ts` — locale config and the
  per-app namespace-loading list (`NAMESPACES` array — add a line here
  whenever a new namespace file is created).
- `apps/web/src/types/i18n.d.ts` — type augmentation; add an import +
  `Messages` entry here whenever a new namespace file is created (same
  moment as the `request.ts` line above — the two always change together).
- `apps/web/messages/{bn,en,hi}/*.json` — the namespace files themselves.
- `scripts/i18n-check.mjs` — the completeness checker, wired into
  `npm run typecheck` in both apps.
- `TODO.md` — has a pointer section near the end directing here; older
  entries earlier in that file describe the *pre-redesign* system and are
  intentionally left as accurate history, not updated.
