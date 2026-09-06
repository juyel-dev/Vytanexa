# i18n — Implementation Spec

> Companion to `I18N-ARCHITECTURE.md` (read that first for the *why*). This is the
> concrete *what*: package layout, exact API signatures, file layout, fallback
> behavior, tooling, and a phased migration checklist grounded in the real,
> currently-existing call sites (counted directly from the codebase, not
> estimated).

---

## 1. Package layout — `packages/i18n` (`@vytanexa/i18n`)

Follows the exact pattern already used by `@vytanexa/database` and
`@vytanexa/config`: raw TypeScript source, no build step, consumed via npm
workspace resolution.

```
packages/i18n/
  package.json                 # name "@vytanexa/i18n", exports map below
  src/
    types.ts                   # Locale, Namespace-agnostic shared types
    locale-config.ts           # per-app locale list + ICU-locale mapping (§3)
    dictionary/
      loadMessages.ts          # ONLY file that dynamically imports namespace JSON
                                # — the swap point for a future remote message source
    server.ts                  # 'server-only' guarded — getT, getLocalizedField,
                                # getLocalizedArray, getFormatter, getResolvedLocale
    client.tsx                 # 'use client' — I18nProvider, useT, useLocalizedField,
                                # useLocalizedArray, useFormatter, useResolvedLocale
    format.ts                  # shared number/date/currency/relative-time logic,
                                # used by both server.ts and client.tsx
    index.ts                   # re-exports types.ts + locale-config.ts ONLY
                                # (server.ts / client.tsx are separate entry points,
                                # never bundled together — see exports map)
```

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
// packages/i18n/src/client.tsx
'use client';
import { createContext, useContext } from 'react';
import type { LocaleConfig } from './types';

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

export function useLocalizedField(translations: LocalizedText | null | undefined): string {
  const { locale, config } = useContext(LocaleContext)!;
  return translations?.[locale] || translations?.[config.defaultLocale] || translations?.['en']
    || Object.values(translations ?? {}).find(Boolean) || '';
}
```

To avoid every app re-passing `config` at every call site, each app creates one
thin, pre-bound wrapper in its own `lib/`:

```ts
// apps/web/src/lib/i18n.ts  (thin — ~10 lines, app-specific binding only)
import { getLocalizedField as _get, getResolvedLocale as _resolve } from '@vytanexa/i18n/server';
import { localeConfig } from '@/i18n/locales';

export const getResolvedLocale = () => _resolve(localeConfig);
export const getLocalizedField = (t: LocalizedText | null | undefined) => _get(t, localeConfig);
```

This preserves the **exact existing call signature** —
`getLocalizedField(doctor.name_translations)` — for every one of the 17 Server-
Component call sites. Only the import line changes
(`from '@/lib/i18n'` stays the same path; only its internal implementation is
replaced). **Zero call-site edits for Server Components.**

For the 23 Client-Component call sites, the equivalent thin wrapper exports a hook:

```ts
// apps/web/src/lib/i18n-client.ts
export const useLocalizedField = /* pre-bound to localeConfig, calls @vytanexa/i18n/client */
```

and those 23 files change `getLocalizedField(x)` → `useLocalizedField(x)` — a
mechanical rename, not a logic change, tracked as an explicit checklist in § 8.

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

## 11. Known duplication to fold in during migration

Six places currently define language display labels, two distinct concerns
conflated:

- **App-UI-locale labels** (true duplicates, same concept): canonical
  `LANGUAGE_NAMES` in `lib/i18n.ts`, re-duplicated as local `LANGUAGES` arrays in
  `onboarding/LanguageStep.tsx` and `settings/LanguageSheet.tsx`. These three
  collapse into one: the namespace file `common.json`'s language names (e.g.
  `common.languages.bn = "বাংলা"`), read via `t()` everywhere, single source.
- **Doctor spoken-language labels** (a *different*, Tier-B-adjacent concept —
  which human languages a doctor speaks, not the app's UI language, even though
  the value set happens to overlap `bn`/`en`/`hi`): ad-hoc ternaries in
  `doctor-profile/DoctorProfileClient.tsx`, `doctor-profile/InfoTab.tsx`, and
  `doctors/FilterSheet.tsx`. These should **not** be forced into `LANGUAGE_NAMES`
  (conflating "UI language" with "doctor's spoken language" is a category error
  waiting to happen the day these two lists diverge — e.g. a doctor who speaks
  Urdu, which will never be an app UI locale). They get their own small,
  explicit `SPOKEN_LANGUAGE_LABELS` namespace entry, resolved with the same
  `t()`, but namespaced separately (`doctor.spokenLanguages.bn`).

## 12. Phased migration checklist

**Phase 1 — foundation (this is the "small architectural change," the rest is
incremental):**
- [ ] Create `packages/i18n` per § 1–5.
- [ ] Replace `apps/{web,admin}/src/lib/i18n.ts` internals with the thin
      pre-bound wrapper (§ 4); keep exact same exported names/signatures for
      `getLocalizedField`, add `getResolvedLocale`, add deprecated re-exports of
      `toBengaliDigits`/`formatRelativeTimeBn` pointing at `getFormatter`.
- [ ] Add `apps/{web,admin}/src/lib/i18n-client.ts` (hook wrapper).
- [ ] Update root `layout.tsx` in both apps: swap `NextIntlClientProvider` for
      `<I18nProvider>` from the facade (1 file per app).
- [ ] Migrate the 3 already-`useTranslations`-using files per app
      (`BottomNav.tsx`, `LanguageSheet.tsx`, `layout.tsx` / `TopBar.tsx`,
      `Sidebar.tsx`, `(auth)/login/page.tsx`) to `useT`/`getT` from the facade.
- [ ] Split `messages/*.json` into namespace files (§ 7) — mechanical, no new
      copy.
- [ ] Add `global.d.ts` type augmentation (§ 6).
- [ ] Add `scripts/i18n-check.mjs`, wire into `typecheck` (§ 8a).
- [ ] **Verify**: language switch in Settings now visibly changes the 3+3
      already-converted surfaces, `getLocalizedField` resolves the cookie-set
      locale on a Server-Component page (spot check `doctors/[slug]`), `tsc
      --noEmit` and `i18n:check` both pass.

**Phase 2 — de-risk the DB-content fix across all existing call sites:**
- [ ] 17 Server-Component files: swap import path only (§ 4) — no other change.
- [ ] 23 Client-Component files: rename `getLocalizedField` → `useLocalizedField`
      call (§ 4) — mechanical, one line each.
- [ ] Fold the 3 true UI-locale-label duplicates into `common.json` (§ 11).
- [ ] Fold the 3 doctor-spoken-language ternaries into their own namespace
      entry (§ 11) — kept separate, not merged with UI locale.

**Phase 3 — incremental hardcoded-string migration (ongoing, not one PR):**
Highest-reuse-first order (biggest blast radius per hour of work):
1. `components/shared/*` (Article/Doctor/Hospital cards — used on nearly every
   list page).
2. `components/layout/*` (nav, top bar, FABs, sheets — visible on every page).
3. Feature verticals one at a time (`doctors/`, `hospitals/`, `blood-services/`,
   `symptoms/`, `qa/`, `polls/`, `articles/`, `account/`, `settings/`,
   `emergency/`, `lab-tests/`), each adding its own namespace file as it's done.
4. `(seo)/*` programmatic pages + `lib/seo-helpers.ts` templates — lowest
   priority (currently Bengali-only by deliberate business design, not broken;
   migrate only once English/Hindi SEO becomes an actual goal — see
   ARCHITECTURE § 6).
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
