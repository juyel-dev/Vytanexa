# IMPLEMENTATION-ROADMAP.md — Vytanexa
Phased build order. Each phase is small-step, incrementally committed.
Check off as completed; update `PROJECT-CONTEXT.md` §5 alongside.

---

## PHASE 0 — Repo Scaffold (Foundation, No Business Logic Yet)
- [x] Extract DB migrations from spec → `packages/database/migrations/`
- [ ] Root `package.json` (npm workspaces: apps/*, packages/*)
- [ ] Root `.gitignore`, `.env.example`, `README.md` (setup instructions)
- [ ] `packages/config` — shared Tailwind preset + design tokens (from
      VYTANEXA-BLUEPRINT.md S01), shared ESLint/Prettier config
- [ ] `apps/web` — Next.js 14 App Router skeleton, TypeScript strict,
      Tailwind wired to shared preset, Supabase client stub
- [ ] `apps/admin` — same skeleton, separate app, admin design tokens
      (ADMIN-PANEL-SPEC.md A01)
- [ ] Verify both apps run locally (`npm run dev` in each) with a
      placeholder "Vytanexa — Coming Soon" page — proves the scaffold
      works before any real feature code

## PHASE 1 — Database Live
- [ ] Provision Supabase project (needs Juyel's credentials — ask)
- [ ] Run migrations 0001→0005 in order against the real project
- [ ] Verify RLS policies active, spot-check with anon key (should see
      only verified doctors, no blood donor phones, etc.)
- [ ] Generate TypeScript types from Supabase schema →
      `packages/database/types.ts` (via `supabase gen types typescript`)
- [ ] Seed ONLY structural reference data if truly needed for dev
      testing (e.g. a couple of test locations) — NEVER production
      demo data, and clearly marked/removable before real launch,
      per the PRODUCTION DATA RULE in PROJECT-CONTEXT.md

## PHASE 2 — User App Core (S01-S09 first — highest-value discovery flow)
- [ ] S01 design tokens → actual `tailwind.config.ts` + global CSS
- [ ] S02 routing shell → App Router file structure, bottom nav, top bar
- [ ] S03 onboarding flow
- [ ] S04 Home page (start with static sections, wire data progressively)
- [ ] S05 Search
- [ ] S06 Doctor List
- [ ] S07 Doctor Profile (the "most critical page" — extra care here)
- [ ] S08 Hospital List/Detail
- [ ] S09 Symptoms

## PHASE 3 — User App Extended (S10-S22)
- [ ] S10 Lab/Diagnostic search · S11 Blood Services · S12 Emergency
- [ ] S13 Articles · S14 Q&A · S15 Polls/Reports
- [ ] S16 More menu · S17 Account · S18 Settings
- [ ] S19 Custom page renderer · S20 Notifications · S21 SEO pages
- [ ] S22 PWA/offline/i18n wiring

## PHASE 4 — Admin Panel Core (A01-A09 first)
- [ ] A01-A02 shell, sidebar, auth/roles
- [ ] A03 Dashboard + moderation queue pattern
- [ ] A04-A06 entity managers (locations, categories, doctors, hospitals,
      ambulance, blood)
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
