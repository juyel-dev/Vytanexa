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

**As of commit `fe8d790`** (last commit in this session):

### Completed
- **Phase 1 — foundation**: `packages/i18n` facade, the core
  `getLocalizedField` locale-threading bug fix, namespace message file
  split, type-safe keys, `scripts/i18n-check.mjs`. Commit `046c9f7`.
- **Phase 2 — DB-content call-site migration**: all 40 `getLocalizedField`
  call sites (17 Server-Component sites needed zero changes; 27
  Client-Component sites migrated); duplicate language-label
  consolidation; admin `SubscriptionsManager.tsx` fix. Two real bugs found
  and fixed in Phase 1's own output: a Rules-of-Hooks violation in the
  client hook design, and a `server-only` module-level taint bug. Commit
  `604d160`.
- **Phase 3, so far** (`components/shared/*`, `components/layout/*`,
  `doctor-profile/*` fully migrated — real bn/en/hi text, not
  placeholders, in every case):
  - Batch 1 (`f5187d8`): shared cards (ArticleCard, DoctorCard,
    HospitalCard, ServicesTab) — found & fixed a transitive
    client-bundling bug affecting all four.
  - Batch 2 (`a7dcf06`): ReviewsTab, DataReportSheet — finishes
    `components/shared/*`.
  - Batch 3 (`5a33770`): BottomNav, TopBar, LocationChip,
    LocationPickerSheet, Footer.
  - Batch 4 (`86fc7a6`): EmergencyFAB — finishes `components/layout/*`.
  - Batch 5 (`cda0672`): AppointmentSheet — consolidated a duplicate
    `yourName` key into `common.json`.
  - Batch 6 (`7774672`): ChambersTab, HospitalsTab, InfoTab,
    DoctorProfileClient, plus `hospital-profile/InfoTab.tsx` (shares
    `lib/chamber-schedule.ts`, refactored to accept injected day
    labels instead of hardcoding them) — finishes `doctor-profile/*`.
    Also added `Formatter.currencyRange()` (wraps
    `Intl.NumberFormat.formatRange`) — fixes a duplicated-currency-symbol
    formatting bug found while migrating the fee display, not just a
    translation.
  - `fe8d790`: this file + `I18N-IMPLEMENTATION-SPEC.md` § 12 updated for
    cross-session resumability.

### Active
Nothing mid-edit — every session so far has ended at a clean, committed,
typechecked, pushed state. If a future session ends mid-file-edit
because a usage limit hit unexpectedly, note that explicitly here
(which file, what state) before the session ends, if there's any warning
at all.

### Blocked
Nothing currently blocked. Two standing limitations, not blockers:
- `next build` cannot be verified in this sandbox (see skill point 1) —
  recommend the person run it in a real environment before deploying,
  especially after any batch that touches a component's `'use client'`
  status.
- No ESLint config exists in the repo at all (pre-existing, unrelated to
  this work) — the `no-restricted-imports` guard against importing
  `next-intl` outside the facade (`I18N-IMPLEMENTATION-SPEC.md` § 8b) is
  recommended but not built; would need sign-off since it's infra beyond
  pure i18n scope.

### Next Move
Continue Phase 3, next directory by hardcoded-char-count (re-run the
inventory command in `I18N-IMPLEMENTATION-SPEC.md` § 12 to get current
numbers — as of the last audit before this file was written, remaining
priority order was: `onboarding/`, `blood-services/`, `qa/`, `account/`,
`symptoms/`, `settings/`, `emergency/`, `lab-tests/`, `polls/`,
`articles/`, remaining `hospital-profile/*`, remaining `home/*`,
`custom-page/*`). Follow the 7-step per-file checklist in
`I18N-IMPLEMENTATION-SPEC.md` § 12's Phase 3 section. No reason to change
approach — the batch-by-batch, verify-then-commit-then-push rhythm has
worked cleanly for 6 batches running.

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
