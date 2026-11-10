# Legacy migration source archive

This directory contains the original numbered SQL files used during early Vytanexa development.

The canonical, timestamped Supabase CLI migration history now lives in `/supabase/migrations/`. Do not add new migrations here and do not rename or rewrite these legacy source files.

For the live-ledger mapping, reconstructed September 2026 donor migration provenance and replay limitations, see:

- `docs/operations/MIGRATION-LEDGER-RECONCILIATION-2026-11-10.md`
- `supabase/README.md`

The legacy `0017_fix_rate_limit_security_definer.sql` is not a standalone live-ledger entry. Its final function effect is included in the canonical `20260831055101_rate_limit_events_retention.sql` migration.
