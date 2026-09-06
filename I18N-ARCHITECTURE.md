# i18n — Architecture Decision Record

> Supersedes the current `apps/web/src/lib/i18n.ts` + `apps/{web,admin}/src/i18n/*` +
> `messages/*.json` setup. That system was audited (see commit history / conversation
> log, not re-duplicated here) and found to be **infrastructure without adoption**:
> next-intl was correctly wired at the low level, but 99% of UI text is hardcoded
> directly in JSX (105/126 web `.tsx` files, 78/87 admin `.tsx` files carry raw Bengali
> literals), and the one function that resolves DB-content translations
> (`getLocalizedField`) is called at 44 sites and **never once receives an actual
> locale** — it silently defaults to `'bn'` everywhere, so changing the language
> setting has almost no visible effect. This is not a library problem. It is a
> **missing forcing function**: nothing made the correct usage the path of least
> resistance, and nothing caught regressions. The redesign fixes both the mechanism
> and the incentive structure, not just the code.

---

## 1. Constraints from the existing codebase (why this, not something else)

Inspected before deciding anything:

- **Framework**: Next.js 14 App Router, both apps (`apps/web`, `apps/admin`).
  Server Components do data fetching (Supabase server client) and pass raw records
  down to `'use client'` components, which currently call `getLocalizedField()`
  themselves. This split (Server fetches → Client renders) is consistent across the
  whole app and is the shape any i18n API has to fit, not fight.
- **Rendering model**: no static export — pages are dynamic/ISR (`revalidate` +
  `cookies()` inside Supabase client forces per-request rendering in practice,
  already documented as such in the codebase). No SSG constraint to design around.
- **Routing**: cookie-based locale, **no URL locale prefix**, by explicit prior
  decision (`VYTANEXA-BLUEPRINT.md` § S02 §7: "same URL serves all languages").
  This redesign does not revisit that decision — see § 6 for why, and what changes
  if it's revisited later.
- **Market**: **India** (correction — an earlier draft of this document
  incorrectly assumed Bangladesh; verified directly from code, not from the
  Bengali UI language alone). Evidence: `+91` country code and 🇮🇳 flag on every
  phone input (`SigninStep.tsx`, `AppointmentSheet.tsx`, `auth/login/page.tsx`),
  `₹` currency throughout (`DoctorCard.tsx`, `ChambersTab.tsx`,
  `SubscriptionsManager.tsx`), and India's real national helpline numbers in
  `NationalNumbersSection.tsx` (100 police / 101 fire / 102 ambulance / 1098
  child helpline / 1930 cyber crime / 14416 Kiran mental health). Bengali is the
  default UI language because the audience is West Bengal, India — not Bangladesh.
  This changes currency (`INR`, not `BDT`) and ICU locale tags (`bn-IN`, not
  `bn-BD`) throughout this design — see § 7.
- **State management**: Zustand for client UI state (onboarding, filters, location).
  Locale is *not* a Zustand concern — it's request/session identity, not UI state —
  so no new store is introduced for it.
- **Monorepo**: plain npm workspaces (no Turborepo), two existing shared packages
  (`@vytanexa/database`, `@vytanexa/config`), both consumed as **raw TypeScript
  source** with no build step (`main`/`types` point straight at `.ts`/`.js`). A new
  shared i18n package follows this exact, already-proven pattern.
- **TypeScript**: `strict: true`, `noUncheckedIndexedAccess: true` in both apps —
  the i18n package must not weaken this.
- **Testing**: **no test runner exists anywhere in the repo** (no Jest/Vitest/
  Playwright, no CI). This is a real constraint, not an oversight to "fix" as part
  of this work — see § 7.
- **Existing dependency**: `next-intl@^3.26.5` already installed in both apps,
  already wired at the plumbing level (`next.config.js` plugin, `i18n/request.ts`,
  `NextIntlClientProvider` in both root layouts). The tool was never the problem.

## 2. Decision: keep next-intl as the engine, hide it behind a facade package

**Chosen approach**: a new shared package, `packages/i18n` (`@vytanexa/i18n`), that
wraps `next-intl` internally and exposes a small, stable API
(`getT`, `useT`, `getLocalizedField`, `useLocalizedField`, `getFormatter`,
`useFormatter`, `I18nProvider`). **No application code imports `next-intl` directly
ever again** — only files inside `packages/i18n/src` are allowed to.

Why not replace next-intl with something custom, and why not use it directly
(no facade)?

| Option | Rejected because |
|---|---|
| Hand-rolled i18n engine | Next.js App Router + RSC + ICU pluralization/interpolation/number-date formatting is exactly what next-intl already solves correctly. Rebuilding it is pure risk for zero benefit — the audit found *zero* evidence the library itself caused any problem. |
| Use next-intl directly everywhere, no facade | Violates the explicit requirement that components depend only on a stable interface. It also means a future migration (e.g. to a translation-management platform that serves messages over an API instead of local JSON) would touch every component that calls `useTranslations()`, instead of one package. |
| **Facade package around next-intl (chosen)** | Components see `t('doctor.findTitle')` and `getLocalizedField(x)` — nothing else. The *only* thing that has to change if the underlying engine, message source, or even the library itself changes later is `packages/i18n/src/**`. This is the actual point of requirement #7 in the brief ("clean boundaries... without requiring widespread changes to application components"). |

This also resolves the **two disconnected systems** problem from the audit: today,
"static UI chrome" (next-intl) and "DB content" (`lib/i18n.ts`'s hand-rolled
`getLocalizedField`) are two independent mechanisms that don't share a locale
source — which is *why* nobody threaded a locale into `getLocalizedField`, there
was no natural single place to get it from. The facade makes locale resolution
**one internal concern**, consumed by both `t()` and `getLocalizedField()`
identically. See § 4.

## 3. Two-tier translation model (kept, because it's correct — the tiers were never
the bug)

- **Tier A — static UI chrome**: buttons, nav labels, empty states, toasts, form
  validation copy. Resolved via `t(key)` / namespace-scoped translations, backed by
  per-locale JSON message files. Uses ICU MessageFormat (interpolation, plurals,
  rich text) — this is next-intl's native strength, no custom work needed.
- **Tier B — dynamic DB content**: `*_translations` JSONB columns (doctor names,
  hospital names, article titles, symptom descriptions, etc.) — a DATABASE-SCHEMA.md
  convention already used consistently across the schema. Resolved via
  `getLocalizedField()` / `getLocalizedArray()`, fallback chain unchanged
  (requested locale → `bn` → `en` → first available key — this logic was already
  correct, it just never received the real locale).

Both tiers already existed. The redesign does not introduce a third concept; it
fixes the plumbing between them and gives them one shared locale source.

## 4. Locale resolution: automatic, not opt-in — this is the actual fix

The root cause of the original failure was an API shape that *required* every
call site to remember to pass/thread a locale, and nothing enforced it. The fix is
structural: **`getLocalizedField()` keeps its exact existing single-argument call
signature** (`getLocalizedField(translations)` — no locale parameter), but now
resolves the current locale internally instead of defaulting to `'bn'`.

- **Server side**: reuses the *already-correct* logic that already lives in
  `apps/web/src/lib/getLocale.ts` (synchronous `cookies().get('locale')`) — that
  function was right, it was just never called. It moves into
  `packages/i18n/src/server.ts` (guarded with the `server-only` package, already a
  project convention in `apps/admin`), and `getLocalizedField`/`getT` call it
  internally. **Zero new async plumbing** — `cookies()` is synchronous in Next 14,
  so no call site needs `await`, and the function signature genuinely does not
  change for any Server-Component call site (~25 of the 44 existing sites are pure
  Server Components — only the import path changes, mechanically, for those).
- **Client side**: Client Components cannot call `cookies()`. They read the
  resolved locale from React Context via a hook (`useLocalizedField()`,
  `useT()`), fed by a single `<I18nProvider locale messages>` at the root layout —
  which wraps (and internally is) `NextIntlClientProvider`, so no second provider
  tree is introduced. The ~15–20 call sites that are Client Components (e.g.
  `ArticleCard.tsx`, `DoctorListClient.tsx`) do need a small, mechanical edit: the
  plain function call becomes a hook call. This is stated honestly as a real,
  scoped piece of migration work — not zero-cost — but it is a rename, not a
  rewrite, and it's the only way to give Client Components a locale without prop-
  drilling it through every component tree (which the codebase doesn't do today
  and shouldn't start doing now).

Net effect: after this fix, it is **structurally impossible** to "forget" to pass
a locale, because the API never accepts one. The previous bug class cannot recur.

## 5. What this architecture allows later, without touching component code

Because components only ever see `t()`, `getLocalizedField()`, and
`getFormatter()`:

- **Add a new language** (e.g. Urdu, Assamese): add one entry to the app's
  `locales` array + one namespace-file set. Zero component changes. (Admin's
  `locales = ['bn']` is a one-line change away from becoming multilingual, if that
  business need ever arrives — the interface is already shared.)
- **Swap the message source** (local JSON → CMS/API → a translation-management
  platform like Crowdin/Lokalise/Tolgee, whose SDKs typically hand back the exact
  same `Record<string, string>` shape next-intl expects): only
  `packages/i18n/src/dictionary/loadMessages.ts` changes — the one file allowed to
  know messages currently come from `import()`-ed JSON.
- **Add per-route/namespace lazy loading** if bundle size ever demands it: an
  internal change to how `I18nProvider` slices `messages` per route. No component
  changes, because components never held a reference to "all messages" — only to
  `t()`.
- **Move to URL-prefixed locale routing** (`/en/doctors/...`) if English-market SEO
  ever becomes a real business goal: this is a routing/middleware change plus a
  locale-resolution-source change inside the facade (URL segment instead of
  cookie) — again, `t()`/`getLocalizedField()` call sites are untouched.
- **Currency/number/date formatting per locale**: already designed in from day one
  (`getFormatter()`/`useFormatter()`, see IMPLEMENTATION-SPEC § 5) rather than
  bolted on later. Using a proper `Intl` locale tag (`en-IN`/`bn-IN`/`hi-IN`) also
  gives correct Indian digit grouping (lakh/crore — `₹1,00,000`, not
  `₹100,000`) automatically, which the old hand-rolled `toBengaliDigits()` never
  produced and could not have.

## 6. Explicit trade-offs

- **Not a URL-locale architecture.** Crawlers (which don't carry the `locale`
  cookie) will only ever see the default-locale (`bn`) version of every page. This
  is unchanged from today and is *not* a regression introduced by this redesign —
  it is an inherited, previously-made business decision (Bengali-first SEO for a
  West Bengal, India audience). It is called out here because it is the one place "add a
  language" does **not** mean "get that language indexed by Google" — that would be
  a separate, larger project (URL routing + hreflang + sitemap changes), out of
  scope here, and the architecture above is deliberately structured so that project
  remains possible later without a rewrite.
- **Namespace-per-file adds mechanical overhead** (many small JSON files instead of
  one) in exchange for scaling to thousands of keys across dozens of feature
  modules without one unreadable monolith, and for a future lazy-loading lever.
  Accepted cost.
- **This work does not migrate all hardcoded strings.** ~180 files carry hardcoded
  text today. Rewriting all of them in one pass would violate "make the smallest
  necessary changes" and would be an unreviewable, high-risk mega-diff. This
  redesign delivers: the fixed foundation, the enforcement tooling that prevents
  new hardcoded strings from being *added* going forward, and a first migrated
  slice (highest-reuse shared components) as a proof point. Full migration is
  explicitly phased in IMPLEMENTATION-SPEC § 8 as ongoing, incremental work.
- **No new test runner.** The repo has none today. Adding Jest/Vitest/RTL purely
  to test i18n would be scope creep beyond what was asked. Verification instead
  relies on `tsc --noEmit` (already the project's existing safety net, now
  strengthened with generated message types) plus a small, dependency-free
  completeness-check script. Adopting a real test runner is noted as a future
  option, not built here.
- **Formatting helpers (`toBengaliDigits`, `formatRelativeTimeBn`) are not deleted
  immediately.** They are correct for Bengali today and widely used (14+ call
  sites). They're marked `@deprecated` in favor of `getFormatter()`/`useFormatter()`
  and removed only once their call sites are migrated — deleting them up front
  would break rendering everywhere that isn't touched in this pass.

## 7. Assumptions made explicit

- All three locales map to their Indian regional ICU tags: `bn` → `bn-IN`,
  `en` → `en-IN`, `hi` → `hi-IN` — this gives correct Indian digit grouping
  (lakh/crore) and is a straightforward, non-speculative choice given the
  confirmed India market (§1). Currency is always `INR` (`₹`) regardless of UI
  locale — only the *label language* changes, not the transaction currency.
- Admin panel stays Bengali-only by product decision (already documented,
  unchanged) — it adopts the *same package* for consistency and future-proofing,
  not because it needs multiple languages today.
- "Thousands of translation strings" and "many features" in the brief are read as
  a scaling target to design *for*, not a size to build out today — namespace
  files are seeded from the current ~43 real keys, split by existing feature
  folders, not invented speculatively.
- No CI exists; the completeness-check script is designed to be run locally
  (`npm run i18n:check`) and is CI-ready (exit code 1 on mismatch) for whenever CI
  is introduced, but wiring actual CI is out of scope here.

See `I18N-IMPLEMENTATION-SPEC.md` for the concrete package layout, API surface,
namespace plan, and phased migration checklist.
