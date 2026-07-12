# PROJECT-CONTEXT.md — Vytanexa
**Read this file FIRST, every session, before touching anything else.**
Its job: let any future Claude session (or any human) reconstruct full
project context in under 2 minutes, without re-reading 4,000+ lines of
spec across the other documents.

---

## 1. WHAT THIS IS

**Vytanexa** (Vita + Nexa = "life-connection system") — a nationwide
(all-India) healthcare discovery & coordination platform. Doctor/
hospital directory, lab-test finder, blood services, emergency access,
health community (Q&A/polls/articles). Formerly "USS" (উত্তরবঙ্গ
স্বাস্থ্য সেতু), was North-Bengal-only; renamed and rescoped to
nationwide in this build.

**Owner/Product Decision-Maker:** Juyel Hossain — non-technical,
20, based in North Bengal, India. Delegates ALL technical/architecture
decisions. Prefers minimal back-and-forth; wants autonomous, confident
decision-making, not repeated clarifying questions.

**My role on this project (Claude):** Not just a document-writer —
treated as Senior Architect / Lead Engineer / Product Strategist / CTO
for this specific project. I make the calls, explain them briefly,
and Juyel course-corrects when needed rather than approving every step.

---

## 2. SOURCE OF TRUTH — THE 3 SPEC DOCUMENTS

| File | Contents | Status |
|---|---|---|
| `VYTANEXA-BLUEPRINT.md` | User-facing app, S01-S22, full screen-by-screen UX/UI spec | ✅ Complete |
| `DATABASE-SCHEMA.md` | 37-table PostgreSQL/Supabase schema, Parts 1-5, RLS everywhere | ✅ Complete |
| `ADMIN-PANEL-SPEC.md` | "Ultra God Mode" admin app, A01-A15 | ✅ Complete |

**These three files are authoritative.** If code and spec ever
disagree, that's a bug to reconcile — update whichever is wrong,
don't silently let them drift apart. `packages/database/migrations/`
is auto-extracted FROM `DATABASE-SCHEMA.md` (see §5) — the markdown is
still the source, not the .sql files.

---

## 3. KEY ARCHITECTURE DECISIONS (Non-Obvious, Don't Re-Litigate)

```
✅ Next.js (App Router, TypeScript) for BOTH user app and admin panel
✅ Monorepo: apps/web (user), apps/admin (admin), packages/* (shared)
✅ Supabase (Postgres) — single project serves both apps
✅ i18n: cookie-based locale, NOT URL-prefixed (/doctors not /bn/doctors)
✅ DB content i18n: JSONB *_translations columns, not separate tables
✅ Soft-delete everywhere (deleted_at), nothing hard-deleted
✅ RLS enforces business rules at the DB layer (defense in depth) —
   e.g. unverified doctors are UNREADABLE publicly at the RLS level,
   not just filtered in app queries
✅ Locations: ONE self-referencing table (state→district→sub-district→
   ward), fully dynamic, admin-created, zero pre-seeded data
✅ Ambulance services: standalone table, NOT folded into hospitals
   (fields diverge too much; providers may be independent)
✅ Subscriptions: polymorphic (entity_type/entity_id), shared between
   doctors & hospitals — one income-stream engine, not one-off tables
✅ Custom pages: JSONB block-based builder (S19/A09) — admin adds
   pages with zero code deploy
✅ God Mode (homepage order, theme, footer, flags) is super_admin-only
✅ NO payment gateway wired yet — subscriptions granted manually by
   admin (A12) until a gateway (Razorpay likely, India-first) is chosen
✅ NO appointment booking calendar — `leads` captures INTENT only,
   explicitly not a confirmed booking system
✅ Analytics events table uses BIGSERIAL not UUID (write-volume reasons),
   designed for monthly partitioning at scale
✅ PRODUCTION DATA RULE: zero demo/dummy/seed data anywhere, ever,
   unless Juyel explicitly asks — empty states instead
```

---

## 4. REPO & CREDENTIALS

**Repo:** `github.com/juyel-dev/Vytanexa` (public)
**Working method established:** Claude uses a GitHub PAT (provided
per-session by Juyel, short-lived, he revokes after use) to commit
directly — small incremental commits, one logical change each, pushed
immediately after each edit. No large uncommitted batches of work.

**Supabase / Vercel:** Not yet provisioned as of this writing. Juyel
has offered to provide a disposable Supabase project (URL + anon key +
service role key) and Vercel account when implementation needs them —
ask when that point is reached, don't assume they exist yet.

**⚠️ Security note for future sessions:** any credential pasted into
chat is inherently exposed in conversation history. Treat every
provided token as short-lived by design; never assume a previously-seen
token in an old transcript is still valid — ask for a fresh one if
credentials are needed and none are present in the current session.

---

## 5. CURRENT STATE OF THE REPO (Update This Section As Work Progresses)

```
Vytanexa/
├── VYTANEXA-BLUEPRINT.md       ✅ complete (S01-S22)
├── DATABASE-SCHEMA.md          ✅ complete (Parts 1-5, 37 tables)
├── ADMIN-PANEL-SPEC.md         ✅ complete (A01-A15)
├── PROJECT-CONTEXT.md          ✅ this file
├── IMPLEMENTATION-ROADMAP.md   ✅ phased build checklist
├── packages/database/migrations/
│   ├── 0001_core.sql           ✅ extracted (locations, app_settings, custom_pages)
│   ├── 0002_doctors.sql        ✅ extracted (categories, doctors, chambers, subscriptions)
│   ├── 0003_hospitals.sql      ✅ extracted (hospitals, test_catalog, blood, ambulance)
│   ├── 0004_engagement.sql     ✅ extracted (reviews, leads, Q&A, polls, articles, notifications)
│   └── 0005_system.sql         ✅ extracted (users, admin_users, analytics, audit, rate limits)
├── apps/web/                   ✅ scaffolded, builds clean (Next.js 14 + TS strict)
├── apps/admin/                 ✅ scaffolded, builds clean (Next.js 14 + TS strict)
└── packages/config/            ✅ shared design tokens + Tailwind preset
```
**Last major milestone:** Phase 0 scaffold complete — both apps
verified with `npm install` + `npm run build` (zero TypeScript errors,
apps/web first-load JS 87.3KB, under S22's 150KB budget). Next
milestone: Phase 1 (provision real Supabase project, run migrations,
generate types) — needs Juyel to provide project credentials.

---

## 6. HOW TO RESUME WORK IN A NEW SESSION

1. Read this file.
2. Check §5 above for what's built vs pending (keep it updated!).
3. Check `IMPLEMENTATION-ROADMAP.md` for the current phase's checklist.
4. If credentials (GitHub PAT / Supabase keys) aren't in the current
   conversation, ask Juyel for fresh ones rather than assuming old
   ones still work.
5. Continue in small, incrementally-committed steps — think before
   writing code, verify before committing, push immediately after
   each verified change (Juyel's explicit working preference).
6. Update this file's §5 (and roadmap checkboxes) as milestones complete
   — this file is only useful if kept current.
