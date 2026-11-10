# Supabase local database workflow

This directory is the canonical Supabase CLI project for Vytanexa.

## Local commands

Install Docker Desktop (or another Docker API-compatible runtime), then use the repository scripts:

```bash
npm run db:start
npm run db:reset:local
npm run db:test
npm run db:lint
npm run db:stop
```

The reset command is deliberately explicit: it recreates **only the local database** and replays every file in `supabase/migrations/`. It does not connect to the hosted project.

The local config uses PostgreSQL 17, matching the main project's major version. Studio, Storage, Realtime, Edge Runtime and Analytics are disabled to reduce local resource use. Auth and PostgREST remain enabled for database/RLS/RPC tests.

## Hosted-project safety

- Do not run `supabase db reset --linked`.
- Do not run `supabase link` against the main project as part of local development.
- Do not run `supabase db push` or `supabase db pull` against the hosted project until the backup gate and migration review are complete.
- Do not set production database passwords, service-role keys or production data in this local environment.
- Before the first hosted DDL, verify a recoverable backup point or create a logical backup and store it outside Git.

## Canonical migration history

The timestamp prefixes in `migrations/` match the live 23-entry migration ledger captured in `docs/operations/MIGRATION-LEDGER-RECONCILIATION-2026-11-10.md`.

Three September 2026 donor migrations were applied to the hosted database via Supabase MCP, but their original SQL was not committed. Their files in this directory are explicitly labelled **RECONSTRUCTED REPLAY MIGRATION**. They recreate the confirmed resulting state for clean local replay; they are not claimed to be byte-identical to the original SQL. Their source/provenance limitations are recorded in the reconciliation document.

A new forward-only migration `20261110122000_fix_get_donor_phone_rpc.sql` replaces the obsolete donor-phone function. It filters by `verification_status`, `deleted_at` and `consent_contact`, and adds an atomic per-account rate limiter in the non-exposed `private` schema. The web contact route also requires a signed-in user and validates stored phone format before returning JSON or redirecting to `tel:`. This migration is included in local replay but has **not** been applied to the hosted main project.

The old `packages/database/migrations/` directory is retained as a legacy source archive. Do not add new migrations there. New database changes belong in `supabase/migrations/`, generated with the pinned Supabase CLI.

The repository file `0017_fix_rate_limit_security_definer.sql` is not a separate live-ledger entry. Its final function effect is present in the subsequent live `rate_limit_events_retention` migration, so it is not replayed as a second migration.

## CI

GitHub Actions installs Supabase CLI v3.1.0 with a verified SHA-256 checksum, starts an isolated local Supabase stack, resets only the local database, runs pgTAP tests and lints the local schema. The workflow uses no hosted Supabase credentials.
