# Vytanexa

**আপনার স্বাস্থ্য, আপনার সংযোগ** — Connect. Care. Live.

Nationwide healthcare discovery & coordination platform. Doctor/hospital
directory, lab-test finder, blood services, emergency access, and a
health community layer — built for real-world use across India.

## 📚 Start Here

Read in this order:
1. **`PROJECT-CONTEXT.md`** — single source of truth, read this first, every session
2. **`IMPLEMENTATION-ROADMAP.md`** — phased build checklist, current status
3. **`VYTANEXA-BLUEPRINT.md`** — full user-app UX/UI spec (S01–S22)
4. **`DATABASE-SCHEMA.md`** — full Postgres/Supabase schema (37 tables)
5. **`ADMIN-PANEL-SPEC.md`** — full admin ("God Mode") panel spec (A01–A15)

## 🏗️ Monorepo Structure

```
apps/
  web/      → user-facing app (Next.js 14, App Router)   — port 3000
  admin/    → internal admin panel (Next.js 14)           — port 3001
packages/
  config/   → shared Tailwind preset + design tokens
  database/ → SQL migrations (extracted from DATABASE-SCHEMA.md)
```

## 🚀 Getting Started

```bash
npm install                 # installs all workspaces from repo root

npm run dev:web              # → http://localhost:3000
npm run dev:admin            # → http://localhost:3001
```

Both apps are verified to `npm run build` cleanly as of the Phase 0
scaffold commit (TypeScript strict mode, zero errors).

### Environment Variables
Copy `.env.example` to `.env.local` inside **both** `apps/web` and
`apps/admin`, fill in real Supabase project values. The service-role
key goes in `apps/admin` only — never in `apps/web`.

### Database
Run the migrations in order against your Supabase project:
```
packages/database/migrations/0001_core.sql
packages/database/migrations/0002_doctors.sql
packages/database/migrations/0003_hospitals.sql
packages/database/migrations/0004_engagement.sql
packages/database/migrations/0005_system.sql
```
These are auto-extracted from `DATABASE-SCHEMA.md` — that markdown
file is the source of truth; if the two ever disagree, the markdown
wins and the `.sql` files should be re-extracted from it.

## ⚠️ Production Data Rule
No demo, dummy, mock, or seed data anywhere in the app, database, or
UI — ever — unless explicitly instructed. Empty states everywhere
until real data exists. See `PROJECT-CONTEXT.md` § 3.

## 🔒 Security Notes
- `apps/admin`'s service-role Supabase client (`server-only`) must
  never be imported into a Client Component or into `apps/web`.
- RLS policies are the real security boundary (every table, see
  `DATABASE-SCHEMA.md`) — app-layer filtering is defense-in-depth on
  top of that, never a substitute for it.

---
Owner: Juyel Hossain · Architecture & implementation: Claude (Anthropic)
