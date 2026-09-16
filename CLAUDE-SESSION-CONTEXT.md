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

**As of commit `a3e628d`** (last commit in this session). Progress:
64/126 web `.tsx` files still have hardcoded Bengali (baseline at the
start of Phase 3 was 105/126). Note: this count includes files whose
only remaining Bengali is inside JSDoc comments quoting spec text —
see "Blocked" below, that's expected and correct, not a miss.

The `.ts` strand (API routes, Zod validations, `manifest.ts`) is fully
closed as of last session — don't re-scan for it, see the previous
session's entry below for what was done.

### Completed
- **Phase 1 — foundation**: `packages/i18n` facade, the core
  `getLocalizedField` locale-threading bug fix, namespace message file
  split, type-safe keys, `scripts/i18n-check.mjs`. Commit `046c9f7`.
- **Phase 2 — DB-content call-site migration**: all 40 `getLocalizedField`
  call sites; duplicate language-label consolidation; admin
  `SubscriptionsManager.tsx` fix. Commit `604d160`.
- **Phase 3, `.tsx` component/page strand, so far** — fully done,
  verified, real bn/en/hi text (not placeholders) in every case:
  `components/shared/*`, `components/layout/*`,
  `components/doctor-profile/*` (+ `hospital-profile/InfoTab.tsx`,
  migrated alongside it), `components/onboarding/*`,
  `components/blood-services/*` (new `blood` namespace),
  `components/qa/*` (new `qa` namespace),
  `components/account/*` (new `account` namespace),
  `components/home/*` — all 12 files, new structured `home` namespace,
  `app/(seo)/[state]/*` (all 3 route pages) + `components/seo/*` +
  **`lib/seo-helpers.ts`** (new `seo` namespace),
  **`app/(main)/account/*`** — all 6 route pages (distinct from
  `components/account/*`; heavy reuse of that batch's namespace keys,
  plus `account.status.{moderation,lead}` for two shared status-label
  maps found duplicated across 3 files).
- **Phase 3, `.ts` strand — closed two sessions ago**: all 9
  `lib/validations/*.ts` Zod schemas converted to locale-aware factory
  functions, all 17 `app/api/**/route.ts` handlers updated, plus
  `app/manifest.ts`. New `validation` namespace (bn/en/hi). A full
  `src/**/*.ts` sweep confirmed nothing left — don't re-scan for this.
  Commits `f5187d8` through `a3e628d` — see
  `git log --oneline 046c9f7~1..HEAD` for the full list; each message
  documents what was migrated *and* what bug or design issue was found
  along the way, several are worth reading in full (`git show <hash>`)
  before resuming, not just skimming the one-liners.

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

**New this session**: `app/(main)/account/*` confirmed the pattern
this effort has been assuming implicitly — a `components/<dir>/*`
batch and an `app/(main)/<same-dir>/*` batch are genuinely separate
work, not overlapping, since route-page files (`page.tsx`) carry their
own titles/metadata/status-label duplication independent of whatever
client components they render. Worth checking, when picking the next
`.tsx` directory, whether it has a components-side counterpart already
done (e.g. `components/home/*` is done, but nothing suggests a parallel
`app/(main)/home` tree exists to check) — most of the remaining
directories below are route-only or component-only, but it's a cheap
check.

Also: `generateMetadata()` (async, replacing a static `export const
metadata` object) is now the established pattern for any page whose
`<title>` needs to be locale-aware — used across 5 of this session's 6
files without issue.

### Next Move
Continue the `.tsx` strand. Re-run the inventory command in
`I18N-IMPLEMENTATION-SPEC.md` § 12 for current numbers before picking
the next directory — as of this session's end, in descending priority
order: `emergency/` (398 chars), `more/` (343), `app/(main)/community/`
(338), `app/(main)/search/` (326), `settings/` (291), `doctors/` (284),
`app/(auth)/auth/` (254), `symptoms/` (241), `app/(main)/health/` (195
— note this includes `health/blood-services/page.tsx`, the route
wrapper around `components/blood-services/*` which was done several
sessions ago; same components-vs-route-page split as this session's
account work), `hospital-profile/` (167, remaining files beyond
`InfoTab.tsx`), `lab-tests/`, `polls/`, `articles/`, `custom-page/*`.
Same 7-step per-file checklist, same batch-verify-commit-push rhythm —
14 batches running clean, no reason to change it.

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
