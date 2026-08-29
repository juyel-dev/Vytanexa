# IMPLEMENTATION-ROADMAP.md — Vytanexa
Phased build order. Each phase is small-step, incrementally committed.
Check off as completed; update `PROJECT-CONTEXT.md` §5 alongside.

---

## PHASE 0 — Repo Scaffold ✅ COMPLETE (Foundation, No Business Logic Yet)
- [x] Extract DB migrations from spec → `packages/database/migrations/`
- [x] Root `package.json` (npm workspaces: apps/*, packages/*)
- [x] Root `.gitignore`, `.env.example`
- [x] `packages/config` — shared Tailwind preset + design tokens (from
      VYTANEXA-BLUEPRINT.md S01)
- [x] `apps/web` — Next.js 14 App Router skeleton, TypeScript strict,
      Tailwind wired to shared preset, Supabase client/server stubs
- [x] `apps/admin` — same skeleton, admin density tokens (A01),
      separate service-role client (server-only) vs browser client
- [x] Root `README.md` (setup instructions)
- [x] `npm install` + `npm run build` verified for both apps —
      TypeScript strict mode, zero errors, apps/web first-load JS
      87.3KB (well under the S22 150KB/route budget)

## PHASE 1 — Database Live ✅ COMPLETE
- [x] Provision Supabase project — done by Juyel: project "Vytanexa"
      (ref `lfrvzdhonsnemdfmxthw`), Postgres 17, region ap-southeast-2
- [x] Run migrations 0001→0005 in order — applied live via Supabase MCP
      connector, all 32 tables created, RLS enabled on every table
- [x] Security & performance hardening pass (0006, 0007) — ran Supabase's
      built-in advisors post-migration, found and fixed REAL issues:
      3 views were SECURITY DEFINER (now security_invoker), a
      question_upvotes policy allowed arbitrary delete/update by anyone
      (tightened to insert+read only), functions had mutable search_path
      (pinned), auth.uid() re-evaluated per-row in 6 policies
      (wrapped in `select` for query-plan caching), 10 missing FK
      indexes added, handle_new_auth_user was public-RPC-callable
      (revoked, trigger-only now)
- [x] Generate TypeScript types → `packages/database/types.ts`
      (fixed a genuine multi-schema generic-type bug in the raw
      generator output — simplified to single-schema helpers, verified
      with a standalone `tsc` compile before wiring in)
- [x] Wire typed `Database` generic into all 3 Supabase clients
      (apps/web browser+server, apps/admin browser+service-role) —
      full `npm run build` verified clean on both apps afterward
- [ ] Seed structural reference data (states/districts) — deferred to
      Phase 6's real location data entry via the Admin Panel's CSV
      bulk import (A04) once that screen is built; not needed yet

## PHASE 2 — User App Core (S01-S09 first — highest-value discovery flow) ✅ COMPLETE
- [x] S01 design tokens → `tailwind.config.ts` extends shared preset +
      layout constants (topbar/navbar/z-index) wired
- [x] S02 routing shell → `(main)` route group, BottomNav (5 tabs,
      active-state via usePathname), TopBar (Variant A Home + Variant B
      Section — C/D/E deferred to the screens that need them),
      placeholder pages for all 5 tabs
- [x] Bengali typography wired via next/font (Hind Siliguri, Noto Sans
      Bengali, Plus Jakarta Sans). **Fixed a real bug found during
      verification:** `@supabase/ssr` was pinned to `^0.5.1` (resolved
      0.5.2), which predates Supabase's `__InternalSupabase` type-gen
      convention — `createServerClient<Database>`/`createBrowserClient
      <Database>` silently returned `never` row types (confirmed via
      isolated test: raw `@supabase/supabase-js` typed correctly, the
      `@supabase/ssr` wrapper didn't). Bumped to `^0.12.3` in both
      apps, confirmed fixed. **Font network caveat still applies:**
      `next build` cannot fetch Google Fonts in this sandbox (allowlist
      excludes `fonts.googleapis.com`) — isolated this by temporarily
      stripping the font import and running a full `next build`, which
      passed clean (exit 0, all 5 routes, correct dynamic/static
      split) confirming every other line of code is correct. Restored
      the real next/font code afterward. Only the font fetch itself is
      unverified in-sandbox; will confirm on first Vercel/local build.
- [x] S04 Home page — first live-data slice: QuickStatsBar (real
      doctor/hospital/district counts), QuickActionsRow (static),
      CategoryGrid (real `categories` query + doctor-count-per-category,
      fixed a second real bug: PostgREST reverse-relationship embeds
      `doctors(count)` aren't statically typeable from the `categories`
      side since the FK lives on `doctors` — restructured to two
      simple, correctly-typed queries instead of forcing a type-cast),
      all 13 sections eventually completed (see TODO.md for the full
      per-section breakdown)
- [x] S03 onboarding flow
- [x] S05 Search (all 4 states + voice search + trending RPC)
- [x] S06 Doctor List
- [x] S07 Doctor Profile (the "most critical page" — extra care taken)
- [x] S08 Hospital List/Detail
- [x] S09 Symptoms (list + detail, incl. migration 0011)

## PHASE 3 — User App Extended (S10-S22) — ✅ COMPLETE
- [x] S10 Lab/Diagnostic search · S11 Blood Services (migrations
        0012/0013) · S12 Emergency (+ district filtering retrofit on
        S08/S10/S11, discovered while building S12)
- [x] S13 Articles · S14 Q&A (feature-flag gated) · S15 Polls/Reports
- [x] S16 More menu · S17 Account (migration 0014) · S18 Settings
- [x] S19 Custom page renderer (all 12 block types) · S20 Notifications
- [x] S21 SEO landing pages (`/(seo)/[state]/[district]/[specialty]` +
        `sitemap.xml` + `robots.txt` — SSG+ISR 6hr, templated content,
        BreadcrumbList/ItemList/FAQPage JSON-LD, internal linking)
- [x] S22 Infrastructure — next-intl (cookie-based, messages/bn|en|hi,
        BottomNav translated, layout provider), PWA (next-pwa manifest
        + offline + precaching), Auth middleware, ui-store

## PHASE 4 — Admin Panel Core (A01-A09 first)
- [x] A01-A02 shell, sidebar, auth/roles (login + dashboard layout +
      role-gated nav + `/api/admin/login|sign-out` + shared UI atoms)
- [x] A03 Dashboard + moderation queue pattern (AttentionCards +
      SummaryCards + RecentActivity; `<ModerationQueue>` deferred to the
      moderation screens)
- [x] A04 entity managers — Locations + Categories (tree UI, CSV bulk
      import, icon picker, reordering, delete-safety per DB RESTRICT)
- [x] A05 Doctors Manager — list (filters, pagination 25, bulk verify/feature),
      CRUD (collapsible sections), chambers schedule UI, verification toggle,
      soft-delete
- [x] A06 Hospitals/Ambulance/Blood — hospitals (type/location/emergency
      filters, services via test_catalog picker, gallery, hours, soft-delete),
      ambulance (location + hospital link, ICU/rate/radius, 24/7), blood
      (donor directory + inventory per hospital, 48h staleness)
- [ ] A07-A09 God Mode (homepage control, theme editor, footer/flags/
      menu, custom page builder) — the highest-value screens for Juyel
      day-to-day

## PHASE 5 — Admin Panel Extended (A10-A15)
- [ ] A10-A11 content tools (articles, Q&A, polls, notifications)
- [ ] A12-A13 business tools (subscriptions, ads, leads)
- [ ] A14-A15 system tools (roles, audit log, analytics, settings)

## PHASE 6 — Hardening & Launch Prep
- [ ] Full RLS audit — attempt to break every table from an anon client
- [ ] Performance pass against S22's budgets (LCP <2.5s, bundle <150KB/route)
- [ ] Real location data entry (via A04's CSV bulk import) — states/
      districts for initial launch region(s)
- [ ] Payment gateway decision + integration (deferred until now
      deliberately — see PROJECT-CONTEXT.md §3)
- [ ] Domain + Vercel deployment for both apps, `admin.vytanexa.app`
      subdomain per ADMIN-PANEL-SPEC.md A02
- [ ] Remove any dev-only seed data before public launch

---

## Working Agreement (Reaffirmed From Juyel's Instructions)
- Small incremental steps, not giant batches
- Think before writing code; check/verify before committing
- Commit + push to the repo as soon as a step is confident/correct
- No demo/dummy/placeholder data in what gets deployed
- Update this roadmap's checkboxes + PROJECT-CONTEXT.md §5 as phases complete
