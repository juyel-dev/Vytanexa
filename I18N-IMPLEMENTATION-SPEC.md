# i18n — Implementation Spec

> Companion to `I18N-ARCHITECTURE.md` (read that first for the *why*). This is the
> concrete *what*: package layout, exact API signatures, file layout, fallback
> behavior, tooling, and a phased migration checklist grounded in the real,
> currently-existing call sites (counted directly from the codebase, not
> estimated).
>
> **Status: Phase 1 (foundation) is implemented, verified, and merged** — this
> document was updated after implementation to match what was actually built,
> not left as an unexecuted plan. Two design details changed from the original
> draft during implementation, both are called out inline where relevant
> (§ 1's `dictionary/` removal, § 1a's `resolve-field.ts` addition). Everything
> else matches the original plan as written.

---

## 1. Package layout — `packages/i18n` (`@vytanexa/i18n`)

Follows the exact pattern already used by `@vytanexa/database` and
`@vytanexa/config`: raw TypeScript source, no build step, consumed via npm
workspace resolution.

```
packages/i18n/
  package.json          # name "@vytanexa/i18n", "exports" map: ".", "./server", "./client"
  src/
    types.ts            # Locale, Json, LocalizedText, LocaleConfig, Messages —
                         # no dependency on @vytanexa/database or next-intl
    resolve-field.ts     # pure fallback-chain logic (resolveLocalizedField,
                         # resolveLocalizedArray, resolveLocale) — no I/O, no
                         # 'server-only' guard, safe to import from either
                         # server.ts or client.tsx without pulling one into
                         # the other's bundle
    format.ts            # createFormatter(locale, config) — Intl-based
                         # number/date/currency/relative-time, used by both
    server.ts            # 'server-only' guarded — getT (next-intl passthrough),
                         # getResolvedLocale, getLocalizedField, getLocalizedArray,
                         # getFormatter
    client.tsx            # 'use client' — I18nProvider, useT (next-intl
                         # passthrough), useResolvedLocale, useLocalizedField,
                         # useLocalizedArray, useFormatter
    index.ts              # re-exports types.ts ONLY (server.ts / client.tsx
                         # are separate entry points, never bundled together)
```

**Changed from the original draft**: no `dictionary/loadMessages.ts` inside
this package. During implementation it became clear the "how are messages
loaded" boundary already existed, correctly, in each app's own
`i18n/request.ts` (next-intl's own documented seam, pre-dating this redesign)
— duplicating that as a second layer inside the shared package would have
been the exact kind of speculative abstraction the brief said not to add.
The swap-the-message-source-later boundary (§ 7's requirement) is
`apps/{app}/src/i18n/request.ts`, unchanged in *responsibility*, just
updated to aggregate multiple namespace files instead of one flat one.
`resolve-field.ts` was added (not in the original draft) once it became
clear `server.ts` and `client.tsx` needed to share the exact same fallback
logic without either importing the other (`server.ts` has a `server-only`
guard that would throw if reachable from client code).

```json
// packages/i18n/package.json
{
  "name": "@vytanexa/i18n",
  "version": "0.1.0",
  "private": true,
  "exports": {
    ".": "./src/index.ts",
    "./server": "./src/server.ts",
    "./client": "./src/client.tsx"
  }
}
```

Two separate entry points (`/server`, `/client`) — not one file with both exports —
so a Client Component can never accidentally pull in `server-only` code (Next.js
would already error on this, but the split also documents intent at the import
line, which is the whole point of "components shouldn't know how translations are
loaded").

`next-intl` itself is imported **only** inside `dictionary/loadMessages.ts`,
`server.ts`, `client.tsx`, and `format.ts`. Nowhere else in the monorepo.

## 2. Types

```ts
// packages/i18n/src/types.ts
export type Locale = string; // constrained per-app by locale-config.ts, not global

/** Shape of every *_translations JSONB column in the database. */
export type LocalizedText = Partial<Record<string, string>>;
export type LocalizedTextArray = Partial<Record<string, string[]>>;
```

`Locale` stays a plain `string` at the package level (each app narrows it via its
own generated union — see § 6) rather than a single hardcoded `'bn' | 'en' | 'hi'`
baked into the shared package, because the admin app's locale set is intentionally
smaller and must not be forced to carry web's languages.

## 3. Locale configuration (per app, not global)

```ts
// apps/web/src/i18n/locales.ts
import type { LocaleConfig } from '@vytanexa/i18n';

export const localeConfig = {
  locales: ['bn', 'en', 'hi'],
  defaultLocale: 'bn',
  // ICU locale used for Intl.NumberFormat / DateTimeFormat / RelativeTimeFormat.
  // India market (ARCHITECTURE §1) — all three map to their Indian regional
  // tags so number grouping is lakh/crore-correct; currency stays INR
  // regardless of UI language.
  intlLocale: { bn: 'bn-IN', en: 'en-IN', hi: 'hi-IN' },
  currency: 'INR',
} as const satisfies LocaleConfig;

export type WebLocale = (typeof localeConfig.locales)[number]; // 'bn' | 'en' | 'hi'
```

```ts
// apps/admin/src/i18n/locales.ts
export const localeConfig = {
  locales: ['bn'],
  defaultLocale: 'bn',
  intlLocale: { bn: 'bn-IN' },
  currency: 'INR',
} as const satisfies LocaleConfig;

export type AdminLocale = 'bn';
```

`packages/i18n` never hardcodes an app's locale list — every function that needs
one receives `localeConfig` as an argument at the app's provider/root-config layer
(once), not at every call site.

## 4. Locale resolution (the actual bug fix)

```ts
// packages/i18n/src/server.ts
import 'server-only';
import { cookies } from 'next/headers';
import type { LocaleConfig } from './types';

// Synchronous — this is the exact logic that already existed, correctly, in
// apps/web/src/lib/getLocale.ts. It just moves here and is now actually called.
export function getResolvedLocale(config: LocaleConfig): string {
  const raw = cookies().get('locale')?.value;
  return raw && config.locales.includes(raw) ? raw : config.defaultLocale;
}

export function getLocalizedField(
  translations: LocalizedText | null | undefined,
  config: LocaleConfig,
): string {
  const locale = getResolvedLocale(config);
  return (
    translations?.[locale] ||
    translations?.[config.defaultLocale] ||
    translations?.['en'] ||
    Object.values(translations ?? {}).find(Boolean) ||
    ''
  );
}
```

```tsx
// packages/i18n/src/client.tsx (actual shape, corrected from this doc's
// first draft — see the note below the code)
'use client';
import { createContext, useCallback, useContext } from 'react';
import type { LocaleConfig, Json } from './types';
import { resolveLocalizedField } from './resolve-field';

const LocaleContext = createContext<{ locale: string; config: LocaleConfig } | null>(null);

export function I18nProvider({ locale, config, messages, children }: {...}) {
  // internally renders NextIntlClientProvider with `messages` + `locale` —
  // next-intl's own client machinery is NOT reimplemented, only wrapped.
  ...
}

export function useResolvedLocale(): string {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useResolvedLocale must be used within <I18nProvider>');
  return ctx.locale;
}

// NOT `useLocalizedField(translations): string`. The hook is called once
// and returns a plain function — the exact shape `useTranslations()` →
// `t(key)` already uses everywhere in this codebase — because a hook
// cannot be called a variable number of times inside `.map()` without
// breaking React's Rules of Hooks, and this app renders lists constantly
// (doctor cards, article cards, category grids). A first version of this
// function resolved the value directly and shipped broken for exactly
// that reason — caught only once real Client-Component call sites
// (`DoctorListClient.tsx`) were migrated in Phase 2, not by `tsc`, which
// can't see this class of bug. See § 12 Phase 2 for the full account.
export function useLocalizedField(): (translations: Json | null | undefined) => string {
  const { locale, config } = useContext(LocaleContext)!;
  return useCallback((t) => resolveLocalizedField(t, locale, config), [locale, config]);
}
```

Consumer shape, everywhere in the app:
```tsx
const localize = useLocalizedField();     // called once, top of component
// ... later, anywhere, including inside .map(), a conditional, a useMemo:
items.map((item) => <span>{localize(item.name_translations)}</span>)
```

To avoid every app re-passing `config` at every call site, each app creates one
thin, pre-bound wrapper in its own `lib/`:

```ts
// apps/web/src/lib/i18n.ts  (thin — server-specific bindings only)
import { getLocalizedField as _get, getResolvedLocale as _resolve } from '@vytanexa/i18n/server';
import { localeConfig } from '@/i18n/config';

export const getResolvedLocale = () => _resolve(localeConfig);
export const getLocalizedField = (t: Json | null | undefined) => _get(t, localeConfig);
```

This preserves the **exact existing call signature** —
`getLocalizedField(doctor.name_translations)` — for every one of the 17 Server-
Component call sites. Only the import line changes
(`from '@/lib/i18n'` stays the same path; only its internal implementation is
replaced). **Zero call-site edits for Server Components** — verified true for
all 17 during Phase 2, not just claimed (I18N-IMPLEMENTATION-SPEC.md § 12).

**Second real finding from Phase 2, worth stating plainly**: `lib/i18n.ts`
imports from `@vytanexa/i18n/server`, which carries a `server-only` guard.
Bundlers apply that guard's browser-field substitution at the *whole
module* level, not per export — so `lib/i18n.ts` also originally held the
deprecated `toBengaliDigits`/`formatRelativeTimeBn`/`LANGUAGE_NAMES`
helpers, and ANY Client Component importing even those pure, cookie-free
functions from that file would fail to bundle. `tsc --noEmit` cannot catch
this (it's a bundler-time check); it surfaced only by manually tracing
every Client-Component importer of `lib/i18n.ts` during Phase 2. Fixed by
extracting those pure, environment-agnostic helpers into a third file,
`lib/i18n-shared.ts` (no `server-only`, no `cookies()`), which both
`lib/i18n.ts` and `lib/i18n-client.ts` re-export — so existing import paths
for those helpers didn't need to change, only the module they resolve
from.

For the Client-Component call sites, the equivalent thin wrapper re-exports the
facade's hooks directly (no extra binding needed — `config` lives in
`<I18nProvider>`'s context already, not passed per call):

```ts
// apps/web/src/lib/i18n-client.ts
export { useLocalizedField, useLocalizedArray, useFormatter } from '@vytanexa/i18n/client';
export { LANGUAGE_NAMES, LANGUAGE_OPTIONS, SPOKEN_LANGUAGE_LABELS, toBengaliDigits, formatRelativeTimeBn } from './i18n-shared';
```

27 files (not 23 — the original count only grepped for `getLocalizedField(`;
4 more turned up during migration that only used the deprecated
`toBengaliDigits`/`formatRelativeTimeBn`/`LANGUAGE_NAMES` helpers, which
needed the exact same import-path fix for the `server-only` taint reason
above) changed `getLocalizedField(x)` → `const localize =
useLocalizedField(); ... localize(x)` — a mechanical rebind-and-rename,
not a logic change, done and verified in § 12 Phase 2.

## 5. Formatting

```ts
// packages/i18n/src/format.ts
export function createFormatter(locale: string, config: LocaleConfig) {
  const intlLocale = config.intlLocale[locale] ?? config.intlLocale[config.defaultLocale];
  return {
    number: (n: number, opts?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(intlLocale, opts).format(n),
    currency: (n: number, opts?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(intlLocale, { style: 'currency', currency: config.currency, ...opts }).format(n),
    dateTime: (d: Date | number, opts?: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(intlLocale, opts).format(d),
    relativeTime: (d: Date) => { /* Intl.RelativeTimeFormat, same buckets
                                     formatRelativeTimeBn already uses */ },
  };
}
```

`Intl.NumberFormat('bn-IN').format(...)` already produces native Bengali digits
(the CLDR `beng` numbering system is the default for `bn`) — so `formatter.number()`
subsumes what `toBengaliDigits()` did by hand, but now also works correctly for
`en`/`hi`. `toBengaliDigits` / `formatRelativeTimeBn` in the current
`lib/i18n.ts` are marked `@deprecated` pointing at `getFormatter()` and kept
working until their ~14 call sites are migrated (§ 8, Phase 4) — not deleted now.

Server usage: `const format = getFormatter();` (sync, same reasoning as
`getLocalizedField`). Client usage: `const format = useFormatter();`.

## 6. Type safety

One `global.d.ts` per app, generated from that app's **default-locale** namespace
set (source of truth = `bn`, matching `defaultLocale`):

```ts
// apps/web/src/types/i18n.d.ts
type WebMessages = typeof import('../../messages/bn/common.json') /* & every other namespace, merged */;
declare interface IntlMessages extends WebMessages {}
```

This is next-intl's documented augmentation point — `t('doctor.nonExistentKey')`
becomes a compile-time TypeScript error, in both the facade and (incidentally)
if anyone still reached next-intl directly. Because `bn` is authored first and is
the completeness source of truth, adding a key always starts in `bn/*.json`.

## 7. Namespace / file layout (seeded from the real, current 43 keys — not invented)

Today: one flat file per locale, 43 keys total, covering only nav + common +
onboarding + home + settings + offline. This is mechanically split into
per-namespace files, **same content, zero new copy**:

```
apps/web/messages/
  bn/  common.json  nav.json  onboarding.json  home.json  settings.json  offline.json
  en/  (same file names, same keys)
  hi/  (same file names, same keys)
```

```
apps/admin/messages/
  bn/  common.json  nav.json  auth.json
```

New namespaces are added **only when a feature is actually migrated** (§ 8), named
after the existing component/feature folder it replaces (`doctor.json`,
`hospital.json`, `blood.json`, `qa.json`, `polls.json`, `articles.json`,
`symptoms.json`, `account.json`, `emergency.json`, `lab-tests.json`, `seo.json`,
...). This mirrors the app's own `components/<feature>/` structure, so "where does
this key live" is never a guess.

Key naming stays `namespace.subsection.key` (already the existing, correct
convention in the current single file — kept as-is):
`doctor.profile.bookAppointment`, `doctor.filters.language`, etc.

**Loading strategy**: `dictionary/loadMessages.ts` dynamically imports every
namespace file for the resolved locale and merges them into one object per
request — cheap at current and medium scale (static JSON, no network I/O,
Next.js's request-scope caching applies). If/when total message payload crosses
roughly 50KB gzipped shipped to the client, switch `I18nProvider`'s `messages`
prop to a `pick(messages, routeNamespaces)` slice per route — the lever already
exists in the design (§5 of ARCHITECTURE.md), not built until it's needed.

## 8. Enforcement tooling (this is what prevents the original failure from repeating)

**a. Completeness check** — `scripts/i18n-check.mjs`, plain Node, zero new
dependencies:

```
node scripts/i18n-check.mjs apps/web/messages
node scripts/i18n-check.mjs apps/admin/messages
```

For every namespace file present in the default-locale directory, asserts every
other locale directory has the same file with the exact same key set (recursively,
for nested objects). Non-zero exit on any mismatch, with a diff-style report
(`missing in en/doctor.json: doctor.filters.newFilter`). Wired into each app's
existing `package.json` as `"i18n:check": "node ../../scripts/i18n-check.mjs ..."`
and appended to the existing `typecheck` script so `npm run typecheck` catches
translation drift the same run it catches type drift — no new top-level command
to remember.

**b. Lint guard against new hardcoded strings** — the repo currently has **no**
`.eslintrc*` file at all (verified: `next lint` has never been configured here).
Recommended, not built in this pass without sign-off since it's infra beyond pure
i18n scope: add a minimal `.eslintrc.json` (`extends: next/core-web-vitals`) plus
a rule flagging non-ASCII / long string literals as JSX text or string-typed
props, set to `"warn"` (never `"error"` while migration is in progress — it must
not block unrelated PRs). This is the actual forcing function the original system
lacked: infra existed silently and nobody was ever told they'd bypassed it. A
`warn` in every contributor's editor and `next lint` output is the fix.

**c. Import boundary** — `no-restricted-imports` rule (same `.eslintrc.json`)
banning `next-intl` from any path outside `packages/i18n/src/**`, so the facade
boundary in ARCHITECTURE §2 is enforced by tooling, not convention alone.

## 9. Missing-translation behavior

- **Tier A**: `getRequestConfig`'s `onError`/`getMessageFallback` (next-intl
  built-ins, wired once in `i18n/request.ts`) catch a missing key, log a
  `console.warn` in development only, and render the `defaultLocale` (`bn`)
  string instead of a raw key or a crash. In production this is silent to the
  user — correctness of *content* is what `i18n:check` (§8a) guards at build/
  commit time, so this path should never actually trigger in a deployed build.
- **Tier B**: unchanged, already-correct fallback chain (requested → `bn` → `en`
  → first non-empty key → `''`), now fed the real locale.

## 10. Testing / verification (no test runner exists — see ARCHITECTURE §6)

- `tsc --noEmit` (already the project's standard) now also catches: typo'd
  translation keys (§6), and wrong `LocalizedText` shapes passed to
  `getLocalizedField`.
- `npm run i18n:check` (§8a) catches translation drift.
- Manual QA checklist per migrated page: toggle language in Settings, confirm the
  migrated surface actually changes (this was the exact thing that silently
  never worked before — verifying it visibly is the point).
- Adopting Vitest for pure-function unit tests (`getResolvedLocale`,
  `getLocalizedField` fallback chain, `createFormatter`) is a reasonable future
  addition and is noted here as a recommendation, not implemented now — it would
  be the first test runner introduced into the repo, which is a decision bigger
  than i18n alone.

## 10a. Related bug found during the India/Bangladesh correction

`apps/admin/src/components/subscriptions/SubscriptionsManager.tsx` hardcodes
`.toLocaleString('bn-BD')` for subscription price display — wrong regional tag
(Bangladesh Bengali, not India Bengali) even before this redesign existed, and a
concrete example of exactly the kind of one-off formatting call this design
replaces. Fixed as part of Phase 2 by routing that display through
`getFormatter().currency()` (§5) instead of a hand-written `toLocaleString` call.

## 11. Known duplication to fold in during migration — ✅ done in Phase 2

Six places originally defined language display labels, two distinct
concerns conflated. **Status: folded, verified, merged** — actual
implementation differed slightly from this section's original plan (noted
inline), corrected here rather than left inaccurate:

- **App-UI-locale labels** (true duplicates, same concept): canonical
  `LANGUAGE_NAMES`, re-duplicated as local, byte-for-byte identical
  `LANGUAGES` arrays in `onboarding/LanguageStep.tsx` and
  `settings/LanguageSheet.tsx`. **Changed from the original plan**: these
  did *not* move into `common.json` as `t()`-resolved keys. Reason found
  during implementation: this data isn't UI copy in one active language —
  it's "show all three language names simultaneously, in a picker,
  regardless of which locale is currently selected" (the whole point of a
  language switcher), which doesn't fit `t()`'s one-active-locale model
  cleanly. It became a single TypeScript constant, `LANGUAGE_OPTIONS` (a
  `{code, native, english}[]` array) in `lib/i18n-shared.ts`, with
  `LANGUAGE_NAMES` (the lookup-map form other call sites want) now
  *derived* from it via `Object.fromEntries` instead of hand-duplicated —
  one source, two shapes for two different consumption patterns, matching
  how this exact kind of data (a static, locale-agnostic label set) was
  already handled elsewhere in the codebase rather than inventing a new
  pattern.
- **Doctor spoken-language labels** (a *different*, Tier-B-adjacent concept —
  which human languages a doctor speaks, not the app's UI language, even though
  the value set happens to overlap `bn`/`en`/`hi`): ad-hoc ternaries in
  `doctor-profile/DoctorProfileClient.tsx`, `doctor-profile/InfoTab.tsx`, and
  a differently-shaped `{code, label}[]` array in `doctors/FilterSheet.tsx`.
  Not forced into `LANGUAGE_NAMES`/`LANGUAGE_OPTIONS`
  (conflating "UI language" with "doctor's spoken language" is a category error
  waiting to happen the day these two lists diverge — e.g. a doctor who speaks
  Urdu, which will never be an app UI locale). Folded into their own
  `SPOKEN_LANGUAGE_LABELS: Record<string, string>` constant, same file —
  same reasoning as above (a static label lookup, not sentence-shaped UI
  copy) for why it's a TS constant rather than a namespace key, kept in a
  clearly-documented separate export so the two concepts can't silently
  merge later.

## 12. Phased migration checklist

**Phase 1 — foundation (this is the "small architectural change," the rest is
incremental). Status: ✅ DONE, verified, merged.**
- [x] Create `packages/i18n` per § 1–5 (`resolve-field.ts` added,
      `dictionary/` dropped — see § 1's "Changed from the original draft").
- [x] Replace `apps/{web,admin}/src/lib/i18n.ts` internals with the thin
      pre-bound wrapper (§ 4); exact same exported name/signature for
      `getLocalizedField`, added `getResolvedLocale`, added deprecated
      re-exports of `toBengaliDigits`/`formatRelativeTimeBn` pointing at
      `getFormatter`. (Admin didn't have a `lib/i18n.ts` before — created
      fresh, for parity; nothing calls it yet, see § 10 note below.)
- [x] Add `apps/{web,admin}/src/lib/i18n-client.ts` (hook wrapper).
- [x] Update root `layout.tsx` in both apps: swap `NextIntlClientProvider` for
      `<I18nProvider>` from the facade.
- [x] Migrate the 6 already-`useTranslations`-using files
      (`BottomNav.tsx`, `LanguageSheet.tsx`, admin `TopBar.tsx`,
      `Sidebar.tsx`, `(auth)/login/page.tsx`, plus each root `layout.tsx`) to
      `useT`/`getT` from the facade.
- [x] Split `messages/*.json` into namespace files (§ 7) — mechanically
      verified byte-for-byte content-equivalent to the originals before the
      old flat files were deleted (a Python round-trip diff, not eyeballed).
- [x] Add `types/i18n.d.ts` type augmentation (§ 6) in both apps.
- [x] Add `scripts/i18n-check.mjs`, wire into `typecheck` in both apps
      (`npm run typecheck` at the repo root now runs it for both workspaces).
- [x] **Verify**: `npm run typecheck` at the repo root passes clean for both
      workspaces (real `tsc --noEmit` + `i18n:check`, run against a real
      `npm install`, not just read — see "Verification method" below).

**Real bugs found and fixed while implementing this phase** (none were in
the original audit — a text-grep audit doesn't catch everything a
type-checker does):
- `apps/web/src/lib/queries/seo.ts`'s `seoDisplayName()` was a *second*,
  locally-named wrapper around `getLocalizedField` with its own
  `locale: string = 'bn'` parameter — same bug class, invisible to the
  original grep-based audit because it doesn't contain the string
  `getLocalizedField(` at any of its own 8 call sites in the `(seo)/*`
  pages. Fixed the same way: dropped the dead parameter, delegates to the
  real resolver.
- `BottomNav.tsx`'s `NavItem.labelKey` and admin's `nav-config.ts`-driven
  `Sidebar.tsx` both build translation keys from a data array rather than
  literal strings — the new `IntlMessages` type augmentation (§ 6) doesn't
  accept a plain `string` there. `BottomNav.tsx` (5 fixed nav items) got a
  literal union type. `nav-config.ts` (dozens of entries across 6 groups,
  also consumed by `auth-verify.ts`'s role gating — not i18n's file to
  couple to next-intl's types) keeps `labelKey: string`; `Sidebar.tsx`
  instead does one small, documented, contained cast
  (`t(key as Parameters<typeof t>[0])`) at the two dynamic-lookup call
  sites — the standard, accepted pattern for genuinely data-driven i18n
  keys. A real typo in `nav-config.ts` still surfaces at runtime via
  next-intl's own missing-key fallback (§ 9); it's just not caught at
  compile time for this specific case, same trade-off any next-intl
  consumer with config-driven nav faces.
- Confirmed (while touching `formatRelativeTimeBn`, deprecated but still
  live) the `toLocaleDateString('bn-BD')` bug mentioned in § 10a — fixed to
  `'bn-IN'` in passing, one line, zero behavior risk.

**Verification method** (honest account, not just "should work"): a real
`npm install` was run (this repo's `node_modules` doesn't ship with the
source), then `npm run typecheck` at the repo root — which runs `tsc
--noEmit && npm run i18n:check` in both `apps/web` and `apps/admin` — was
run repeatedly until clean. `next build` was **not** run: it requires live
`NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` credentials (several
pages fetch from Supabase during metadata/static generation) that aren't
available in this environment, and attempting it without them would fail
for reasons unrelated to this change, not validate anything real. `next
lint` was tried and confirmed to still have no ESLint config at all
(pre-existing gap, unrelated to this work, matches ARCHITECTURE § 8b).
**Recommended next step for whoever deploys this**: run `next build` for
both apps in an environment with real credentials before merging further,
as a final check `tsc` can't cover (route generation, the dynamic
`import()` namespace-loading in `i18n/request.ts` actually resolving at
build time, etc.).

**Phase 2 — de-risk the DB-content fix across all existing call sites.
Status: ✅ DONE, verified, merged.**
- [x] 17 Server-Component files: confirmed **zero code changes needed** —
      all 17 already imported `getLocalizedField` from `@/lib/i18n`
      unchanged since Phase 1, so Phase 1's fix already covers them.
      Verified individually, not assumed (every one of the 17 files'
      import line was greped and checked).
- [x] 27 Client-Component files (not 23 — see the finding below) migrated.
- [x] Fold the 2 true UI-locale-label duplicates
      (`onboarding/LanguageStep.tsx`, `settings/LanguageSheet.tsx` — both
      had a byte-for-byte identical `LANGUAGES` array) into one
      `LANGUAGE_OPTIONS` constant in `lib/i18n-shared.ts`, with
      `LANGUAGE_NAMES` now *derived* from it instead of hand-duplicated
      (§ 11 undercounted this as "3 duplicates" — the third,
      `LANGUAGE_NAMES` itself, was already the canonical source, not a
      duplicate of the other two; fixed count: 2 duplicates folded into 1
      source plus the pre-existing map).
- [x] Fold the 3 doctor-spoken-language ternaries/arrays
      (`DoctorProfileClient.tsx`, `doctor-profile/InfoTab.tsx`,
      `doctors/FilterSheet.tsx`) into `SPOKEN_LANGUAGE_LABELS` in
      `lib/i18n-shared.ts` — kept separate from `LANGUAGE_NAMES` as
      designed (§ 11), not merged.
- [x] Routed admin's `SubscriptionsManager.tsx` price display through
      `useFormatter().currency()` and its two direct `.bn` accesses
      through `useLocalizedField()`.

**Two real, load-bearing bugs found during Phase 2's own implementation**
(neither was anticipated by Phase 1's plan or its `tsc`-only verification
— both are documented in detail, with the fix, in § 4 above; summarized
here for the checklist record):

1. **Rules-of-Hooks violation.** The first draft of `useLocalizedField`
   (Phase 1) resolved a value directly:
   `useLocalizedField(translations): string`. The very first
   Client-Component migration (`DoctorListClient.tsx`) revealed this is
   called inside `.map()` for every list in the app — a hook cannot be
   called a variable number of times per render. Redesigned to the
   `useTranslations()` → `t()` shape: `useLocalizedField()` returns a
   plain function, called once per component, safe to invoke anywhere
   afterward including inside `.map()`, `useMemo`, conditionals. This
   changed `@vytanexa/i18n/client`'s public API (not just an internal
   detail) after Phase 1 had already shipped it — corrected before wider
   adoption made it expensive to fix, but a real design mistake, stated
   plainly rather than glossed over.
2. **`server-only` module-level taint.** `lib/i18n.ts` transitively
   carries `server-only` (via `@vytanexa/i18n/server`). Bundlers apply
   `server-only`'s guard to the *whole importing module*, not per export
   — so the deprecated `toBengaliDigits`/`formatRelativeTimeBn` and the
   `LANGUAGE_NAMES` constant, despite being pure and cookie-free, were
   unimportable from any Client Component as long as they lived in
   `lib/i18n.ts`. This is invisible to `tsc --noEmit` (bundler-time
   check, not a type error) and could not be verified with a real `next
   build` in this sandbox (network restrictions block the Google Fonts
   fetch during the build's compile step, before webpack would even
   reach the violation — see § 12's "Verification method" above). Found
   by manually tracing every Client-Component importer of `lib/i18n.ts`.
   Fixed by extracting the pure helpers into `lib/i18n-shared.ts` (no
   `server-only`, no `cookies()`), re-exported by both `lib/i18n.ts` and
   `lib/i18n-client.ts` so existing import *names* didn't need to change,
   only which module they resolve from.

Also fixed in passing while migrating: several `useMemo`/`useCallback`
call sites (`BloodServicesClient.tsx`'s `districtNameById`,
`SymptomsListClient.tsx`'s `filtered`/`groups`) used the new `localize`
function inside their body without listing it in the dependency array —
harmless under the old always-`'bn'` behavior (nothing to react to), a
real stale-memo bug now that locale is live. Caught by a small
purpose-written script (not manual inspection) that parses every
`useMemo`/`useCallback` in a file using either hook and flags a missing
dependency; re-run as a final sweep across both apps with zero remaining
hits.

**Phase 3 — incremental hardcoded-string migration (ongoing, not one PR).
Status: IN PROGRESS — see the live checklist below before starting new
work, not just this prose.**

Highest-reuse-first order (biggest blast radius per hour of work):
1. `components/shared/*` — ✅ **DONE** (all 8 files: ArticleCard, DoctorCard,
   HospitalCard, FavoriteToggle, MoreOptionsSheet, ShareSheet, ReviewsTab,
   DataReportSheet). Also fixed a real bug found along the way: 4 of these
   had no `'use client'` of their own but were transitively client-bundled
   — see this doc's commit history (`git log --oneline --grep=i18n`) for
   the exact reasoning, not repeated here.
2. `components/layout/*` — ✅ **DONE** (BottomNav, TopBar, LocationChip,
   LocationPickerSheet, Footer, EmergencyFAB).
3. Feature verticals, one at a time, each adding its own namespace file:
   - `doctor-profile/*` — ✅ **DONE** (AppointmentSheet, ChambersTab,
     HospitalsTab, InfoTab, DoctorProfileClient). `hospital-profile/InfoTab.tsx`
     done alongside it (shares `lib/chamber-schedule.ts`).
   - Remaining, in descending hardcoded-char-count order as of the last
     audit (re-run the inventory command below before resuming — this list
     goes stale as work lands):
     `onboarding/`, `blood-services/`, `qa/`, `account/`, `symptoms/`,
     `settings/`, `emergency/`, `lab-tests/`, `polls/`, `articles/`,
     remaining `hospital-profile/*`, remaining `home/*`, `custom-page/*`.
4. `(seo)/*` programmatic pages + `lib/seo-helpers.ts` templates — lowest
   priority (currently Bengali-only by deliberate business design, not broken;
   migrate only once English/Hindi SEO becomes an actual goal — see
   ARCHITECTURE § 6).

**To resume this work in a new session** (deliberately written for that —
long-running work across many short sessions is expected, not an edge
case): re-run the inventory command to get current, not stale, numbers —

```
cd apps/web && python3 -c "
import re, glob
pattern = re.compile('[\u0980-\u09FF]')
dirs = {}
for f in glob.glob('src/components/**/*.tsx', recursive=True) + glob.glob('src/app/**/*.tsx', recursive=True):
    txt = open(f, encoding='utf-8').read()
    n = len(pattern.findall(txt))
    if n == 0: continue
    parts = f.split('/')
    key = parts[2] if parts[1] == 'components' else 'app/' + '/'.join(parts[2:4])
    dirs[key] = dirs.get(key, 0) + n
for k, v in sorted(dirs.items(), key=lambda x: -x[1]):
    print(f'{v:6d}  {k}')
"
```

then pick the top of that list, check it's not already `.tsx`-comment-only
(`grep -n` the specific file — several "done" directories still show a
nonzero count from JSDoc comments quoting spec text, which is correct to
leave alone, not a sign the directory needs revisiting), and follow the
established per-file pattern: (1) check `head -3 file | grep "'use client'"`
and if absent, check whether any `'use client'` file imports it directly —
this is the bug class found in batch 1, don't skip this check; (2) extract
strings into a namespace file (reuse `common.json`/existing sibling
namespace keys before adding new ones — several near-duplicates were found
and consolidated in batches 5–6, check first); (3) add real bn/en/hi
translations, not placeholders; (4) wire `useT`/`getT`, `useLocalizedField`/
`getLocalizedField`, `useFormatter`/`getFormatter` as appropriate; (5) run
`npm run typecheck` (must stay clean); (6) grep the file for remaining
Bengali unicode range to confirm zero runtime hits remain; (7) commit with
a message that states what was found, not just what was done — several
real bugs in this migration were only caught by writing the honest
commit message and re-checking a claim before making it.

Track progress as a literal checklist (file count converted / 105 web + 78
admin, per the original audit) — visible, incremental, never a "finish i18n"
mega-task.

**Phase 4 — formatter consolidation (after Phase 3 substantially lands):**
- [ ] Migrate the ~14 `toBengaliDigits`/`formatRelativeTimeBn` call sites to
      `getFormatter()`/`useFormatter()`.
- [ ] Delete the deprecated functions once call-site count hits zero (grep-
      verifiable, add as a check in `i18n-check.mjs` reporting a "deprecated
      usage count" so it's a visible, trending-to-zero metric rather than an
      open-ended TODO).

**Phase 5 — optional, business-decision-gated (not scheduled):**
- [ ] Evaluate URL-prefixed locale routing if/when English or Hindi organic

      search becomes a real acquisition channel (ARCHITECTURE § 6). Only the
      locale-resolution source inside the facade changes; `t()`/
      `getLocalizedField()` call sites are unaffected.
