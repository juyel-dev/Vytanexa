# Admin panel i18n strand — research & execution plan

**Status as of this writing: researched and planned, NOT started.**
This is Phase 3's second remaining strand (see
`I18N-IMPLEMENTATION-SPEC.md` §12) — the web `.tsx` strand is fully
closed; this doc is what a future session reads before touching
`apps/admin`. Read this whole file before writing any code here; it
front-loads the reuse research so the admin strand doesn't repeat web's
early "found duplication late" pattern.

## 0. Why this is lower priority than it looks

The admin panel is **intentionally Bengali-only** by design —
`ADMIN-PANEL-SPEC.md` § A02: single Bengali-speaking operator, every
spec mockup is Bengali, en/hi would be fabricated for no one. Migrating
this strand to the `t()` facade produces **zero user-visible change
today** — it's pure architectural consistency / future-proofing (the
config already shares `@vytanexa/i18n` with `apps/web`; adding a locale
later is a one-line change to `localeConfig.locales` with zero
component-level changes required, per the comment in
`apps/admin/src/i18n/config.ts`). Do this when there's a lull, not
under time pressure, and don't let it block anything user-facing.

## 1. Baseline (verified by direct inspection, not estimated)

- 87 `.tsx` files total in `apps/admin/src`; **78 have hardcoded
  Bengali**, matching the count `I18N-IMPLEMENTATION-SPEC.md` already
  cited.
- **3 files already migrated** (Phase 1, same batch as web's original
  6): `components/layout/{TopBar,Sidebar}.tsx`,
  `app/(auth)/login/page.tsx`. Don't re-touch these; if they show a
  nonzero grep count, check for JSDoc-only first (same convention as
  web).
- **5 existing namespaces**: `app.json` (title/tagline only),
  `nav.json` (full sidebar label set — every nav item, already wired),
  `auth.json`, `common.json`, `toast.json`.
- **41 of 87 files are `'use client'`**; the rest are Server
  Components. Same dual `useT()`/`getT()` facade split as web applies
  — nothing new needed there (`@vytanexa/i18n/client` and
  `@vytanexa/i18n/server`, same as `apps/web`).
- Total Bengali-character volume across the 78 files is roughly
  **3–4× the web strand's original 105-file baseline** — admin forms
  are denser (a single form component commonly has 40–80+ distinct
  labels/placeholders/section headers) even though fewer files are
  involved. Budget accordingly: this is a multi-session effort on the
  scale of (or larger than) the web strand that was just closed.
- **No translation-writing step.** Since it's bn-only, every batch is
  pure extraction + wiring (move a hardcoded string into
  `messages/bn/<ns>.json`, call `t('key')`) — no en/hi copywriting
  decisions to make. This makes each batch mechanically faster than
  the equivalent web batch, but the string *volume* per file is
  higher, so total batch count will likely still land in the same
  range (20–30+) as the web strand's 18.

## 2. Reuse foundation — read these two files first, every batch

`common.json` already covers generic CRUD chrome that will recur in
nearly every module:
```
save, cancel, delete, edit, back, search, loading, error, retry,
noData, confirm
```
`toast.json` already covers the generic save/delete toast pattern:
```
saved: "সংরক্ষিত হয়েছে ✅"
deleted: "মুছে ফেলা হয়েছে"
error: "সংরক্ষণ করতে সমস্যা হয়েছে"
```
`nav.json` has the Bengali label for every module already (doctors,
hospitals, locations, categories, bloodDonors, ambulance, moderation,
reviews, qa, reports, articles, polls, pages, notifications, leads,
subscriptions, ads, godMode, homepage, theme, footer, flags, menu,
analytics, admins, auditLog, settings) — **check `nav.json` before
adding a `pageTitle` key to any module's own namespace**, the same way
web's `hospital.pageTitle` vs `hospital.type.hospital` decision went
(reuse when the text is genuinely the same concept, keep separate when
it only coincides today).

**Confirmed exact-match reuse spotted during research** (don't
re-derive these, they're already checked):
- `ConfirmDialog.tsx`'s default params `confirmLabel = 'নিশ্চিত করুন'`
  and `cancelLabel = 'বাতিল'` are exact matches for `common.confirm`
  and `common.cancel`.
- `DoctorForm.tsx`'s `'সংরক্ষিত হয়েছে ✅'` toast is an exact match for
  `toast.saved`.
- Expect this pattern (a component's local toast/confirm string being
  an exact match for an existing `common`/`toast` key) to repeat
  heavily across every module — check both files before adding any new
  generic-sounding key.

## 3. Priority-1 batch: `components/ui/*` shared primitives

Same "fix the shared components first, cascades to everything" logic
as web batch 1 (`components/shared/*`). Four files, all imported by
essentially every module's table/form:

- **`ConfirmDialog.tsx`** (27 chars) — default-parameter values can't
  call a hook directly (`useT()` inside a default-parameter
  expression violates rules-of-hooks / isn't reliably inside the
  render). Fix: drop the string defaults from the destructured
  signature (keep `confirmLabel?: string`), call
  `const t = useT('common')` in the function body, and resolve with
  `confirmLabel ?? t('confirm')` / `cancelLabel ?? t('cancel')`. Same
  for the busy-state `'প্রসেস হচ্ছে...'` string — needs a new
  `common.processing` key (checked: no existing match).
- **`Toast.tsx`** (22 chars, but confirmed comment-only — the actual
  Bengali is in a JSDoc example, not code). **No code change needed
  here.** The real work is at every *call site*
  (`toast.push('সংরক্ষিত হয়েছে ✅')` scattered across all 78 files) —
  each call site should become `toast.push(t('saved'))` etc. as part
  of migrating that file's own module, not as a separate pass.
- **`DataTable.tsx`** (6 chars) — check what's left; likely a column
  header or empty-state fallback, quick.
- **`StatusBadge.tsx`** (0 chars per current grep) — already clean,
  confirm and skip.

Do this batch first, before any per-module work, exactly like web did
with `components/shared/*`.

## 4. Per-module batch order (by hardcoded-char volume, descending)

Directory-level totals (from the inventory command in §6), each
including its `.tsx` files' component + the matching
`app/(dashboard)/<module>/*` route pages, same "fold the route page
into the component's batch" pattern web used from batch 20 onward:

| # | Module | Component files (chars) | Route pages (chars) |
|---|--------|--------------------------|----------------------|
| 1 | god-mode | FeatureFlags 501, HomepageControl 607, ThemeEditor 274, FooterEditor 250, MenuManager 241 | `app/(dashboard)/god-mode/*` 273 |
| 2 | moderation | ReviewsQueue 617, QuestionsQueue 512, ReportsQueue 460, ModerationShell 11 | — |
| 3 | doctors | DoctorsTable 558, DoctorForm 544, ChamberEditor 268 | `app/(dashboard)/doctors/*` 210 |
| 4 | locations | LocationImportDialog 515, LocationsManager 387, LocationModal 283 | `app/(dashboard)/locations/*` 81 |
| 5 | custom-pages | PageBuilder 755, PagesList 328 | `app/(dashboard)/pages/*` 58 |
| 6 | hospitals | HospitalForm 599, HospitalsTable 261 | `app/(dashboard)/hospitals/*` 111 |
| 7 | blood | BloodManager 800 | `app/(dashboard)/blood-donors/*` 20 |
| 8 | subscriptions | SubscriptionsManager 653 | `app/(dashboard)/subscriptions/*` 39 |
| 9 | categories | CategoriesManager 359, CategoryModal 265 | `app/(dashboard)/categories/*` 151 |
| 10 | articles | ArticleForm 392, ArticlesTable 229 | `app/(dashboard)/articles/*` 68 |
| 11 | admins | AdminsManager 468 | `app/(dashboard)/admins/*` 50 |
| 12 | polls | PollForm 270, PollsList 159 | `app/(dashboard)/polls/*` 32 |
| 13 | ambulance | AmbulanceManager 425 | `app/(dashboard)/ambulance/*` 13 |
| 14 | dashboard | RecentActivity 222, AttentionCards 76, SummaryCards 64 | `app/(dashboard)/page.tsx` 110 |
| 15 | ads | AdsManager 351 | `app/(dashboard)/ads/*` 54 |
| 16 | notifications | NotificationsManager 298 | `app/(dashboard)/notifications/*` 42 |
| 17 | qa | QaManager 231 | `app/(dashboard)/qa/*` 95 |
| 18 | settings | SettingsForm 211 | `app/(dashboard)/settings/*` 37 |
| 19 | leads | LeadsManager 210 | `app/(dashboard)/leads/*` 67 |
| 20 | analytics | AnalyticsDashboard 157 | `app/(dashboard)/analytics/*` 38 |
| 21 | audit | AuditLogViewer 84 | `app/(dashboard)/audit-log/*` 49 |

Plus, not tied to a module, root-level dashboard chrome:
`app/(dashboard)/error.tsx` (102), `app/(dashboard)/not-found.tsx`
(89) — same pattern as web batch 30, likely reusing `common.{error,
retry}` and needing a `common.notFoundHeading`/`notFoundBody`-style
pair (check web's `common.json` additions from that batch — if the
Bengali text matches, this is a rare case where **cross-app reuse
doesn't apply** since admin and web have separate `messages/`
directories, but the *key names and structure* are worth mirroring for
consistency).

**Recommended within-module namespace naming**: one `.json` per
module matching its directory name (`doctors.json`, `hospitals.json`,
`locations.json`, `customPages.json` — camelCase for the hyphenated
`custom-pages` and `god-mode` directories, same convention web used
for `labTests`/`customPage`), extending `common.json`/`toast.json`
first wherever an exact match exists before creating a new key.

## 5. Known gotchas specific to admin (don't rediscover these)

- **Default-parameter Bengali strings** (the `ConfirmDialog` pattern
  above) will very likely recur in other shared/reusable pieces within
  modules (e.g. a module-local `Modal` or `FormField` wrapper with a
  default label). Same fix pattern: drop the default from the
  destructure, resolve with `??` inside the body after calling
  `useT()`.
- **`'use client'`-less files that use hooks** (`ConfirmDialog.tsx`
  has no `'use client'` of its own but uses `useRef`/`useEffect`) rely
  on always being rendered inside an already-client tree. This is fine
  for `useT()` too (same hook-context requirement) — no extra
  `'use client'` needs adding, but *do* verify each file that looks
  like this is never imported from a Server Component context before
  assuming `useT()` is safe there (same check web batch 1 established
  for `components/shared/*`).
- Every module's table almost certainly has a delete-confirm flow
  wired through `ConfirmDialog` — once that component is migrated
  (§3), each module's usage of it just needs its **own**
  `title`/`description` strings extracted (the confirm/cancel button
  text will already resolve for free via the new defaults).
- `getT` import source: same as web —
  `import { getT } from '@vytanexa/i18n/server'`, not re-exported via
  any `lib/i18n.ts` equivalent (check whether admin even has one
  before assuming it doesn't).
- Verification protocol is identical to web's: `npm run typecheck`
  clean at every step (already covers `@vytanexa/admin`'s own
  `i18n:check` script — confirmed it currently reports "1 locale(s)"
  which will need to still pass after every batch), grep the touched
  file for the Bengali-Unicode range to confirm zero real runtime hits
  remain (JSDoc comments are the same acceptable exception as web).

## 6. Inventory command (re-run before resuming — this list goes stale)

```
cd apps/admin && python3 -c "
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

## 7. When to actually start this

Per the user's direction: not now. This doc exists so a future
session (possibly a different day, possibly prompted by "continue the
admin i18n strand") can start straight into §3 (the `components/ui/*`
batch) without re-deriving any of the above. Update this file's
"Status" line at the top when work actually begins, and start logging
batches the same way `I18N-IMPLEMENTATION-SPEC.md` §12 and
`CLAUDE-SESSION-CONTEXT.md`'s Work State do for the web strand —
commit messages that state what was found, not just what changed.
