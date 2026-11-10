# Vytanexa Supabase Migration Ledger Reconciliation

**Snapshot date:** 2026-11-10  
**Project:** `lfrvzdhonsnemdfmxthw`  
**Scope:** Live migration history compared with the repository's `packages/database/migrations/` directory. The ledger records version/name metadata, not SQL checksums or original migration source.

## 1. Exact live migration ledger

The main project returned these **23** entries:

| # | Live version | Live migration name | Repository mapping |
| ---: | --- | --- | --- |
| 1 | `20260713104602` | `0001_core` | `0001_core.sql` |
| 2 | `20260713104638` | `0002_doctors` | `0002_doctors.sql` |
| 3 | `20260713104711` | `0003_hospitals` | `0003_hospitals.sql` |
| 4 | `20260713104801` | `0004_engagement` | `0004_engagement.sql` |
| 5 | `20260713104835` | `0005_system` | `0005_system.sql` |
| 6 | `20260713105108` | `0006_security_and_performance_hardening` | `0006_security_and_performance_hardening.sql` |
| 7 | `20260713105129` | `0007_lock_is_admin_execute` | `0007_lock_is_admin_execute.sql` |
| 8 | `20260716045249` | `0008_symptoms` | `0008_symptoms.sql` |
| 9 | `20260716045305` | `0009_ads` | `0009_ads.sql` |
| 10 | `20260718171316` | `0010_trending_searches_rpc` | `0010_trending_searches_rpc.sql` |
| 11 | `20260809122100` | `0011_symptom_causes_and_advice` | `0011_symptom_causes_and_advice.sql` |
| 12 | `20260809174727` | `0012_donor_phone_reveal_rpc` | `0012_donor_phone_reveal_rpc.sql` |
| 13 | `20260809175248` | `0013_fix_get_donor_phone_search_path` | `0013_fix_get_donor_phone_search_path.sql` |
| 14 | `20260815132000` | `0014_account_history_support` | `0014_account_history_support.sql` |
| 15 | `20260829130738` | `0015_fix_own_read_policy_perf` | `0015_fix_own_read_policy_perf.sql` |
| 16 | `20260829130843` | `0016_fix_questions_select_deleted_at` | `0016_fix_questions_select_deleted_at.sql` |
| 17 | `20260831055101` | `rate_limit_events_retention` | Strong source/effect match to `0018_rate_limit_events_retention.sql`; see §2 |
| 18 | `20260905071637` | `0017_blood_donors_login_gate` | No source file in repository |
| 19 | `20260905071701` | `0018_fix_blood_donors_view_security_invoker` | No source file in repository |
| 20 | `20260905071730` | `0019_fix_donor_insert_policy_perf` | No source file in repository |
| 21 | `20261001062913` | `blood_donors_register_and_list_rpc` | Function/source match observed with `0019_blood_donors_register_and_list_rpc.sql` |
| 22 | `20261005084325` | `delete_my_account_rpc` | Function/source match observed with `0020_delete_my_account_rpc.sql` |
| 23 | `20261108170701` | `0021_push_subscriptions` | Table/RPC objects exist; ledger says applied. See §3 |

## 2. Rate limiter migration naming

The repository contains:

- `0017_fix_rate_limit_security_definer.sql`: defines `check_rate_limit` as SECURITY DEFINER without retention cleanup. There is no live ledger row with this migration name/version.
- `0018_rate_limit_events_retention.sql`: defines the same function with SECURITY DEFINER and probabilistic deletion of events older than seven days.

The current live `check_rate_limit` function definition includes both SECURITY DEFINER and the seven-day probabilistic cleanup, and the live ledger contains `rate_limit_events_retention`. Therefore the final function effect is present in the main project and strongly matches repository file 0018. This does **not** establish that repository file 0017 was separately applied. Treat 0017 as an unverified/superseded repository migration candidate; do not mark it applied or delete it without a documented history decision.

## 3. Push migration status

The live ledger records version `20261108170701`, name `0021_push_subscriptions`. The `push_subscriptions` table and its two public registration/unregistration RPCs are present. The source file's first comment still says the migration is "NOT yet applied to the live DB." That comment is stale, but the applied SQL file is historical source: do not rewrite it. Correct the status in documentation and use a forward-only migration for any actual future changes.

## 4. Live-only historical migrations

The following live rows do not have corresponding files in the repository directory:

1. `20260905071637 / 0017_blood_donors_login_gate`
   - Current donor INSERT policy requires `consent_contact = true` and `user_id = auth.uid()`.
   - Current registration RPC also requires an authenticated caller.
   - The current effect is visible, but the exact original migration SQL and its Git provenance are not recovered.

2. `20260905071701 / 0018_fix_blood_donors_view_security_invoker`
   - `public_blood_donors` is currently a view with `security_invoker=true`.
   - Exact historical SQL is not recovered.

3. `20260905071730 / 0019_fix_donor_insert_policy_perf`
   - The donor own-insert policy uses a scalar subquery around `auth.uid()`, consistent with the performance fix.
   - Exact historical SQL is not recovered.

These must be recovered from the historical PR/commit/dashboard audit if possible. If they cannot be recovered, keep the live ledger facts and current catalog snapshot as an explicitly reviewed baseline record. Do not manufacture the original migration text.

## 5. Donor contact function defect

The current live `get_donor_phone(uuid)` still references `blood_donors.is_active`. That column does not exist; the table has `verification_status`, `deleted_at` and `consent_contact`. A read-only call with a non-existent UUID returned PostgreSQL error `42703: column "is_active" does not exist`.

This demonstrates why migration-name comparison is not enough: migrations 0012/0013 may have run successfully at the time, but their function logic was not kept aligned with later donor schema changes. A new forward-only correction is needed after the backup gate and local/CI migration process are ready.

## 6. Evidence and limitations

- Live state was queried directly through the Supabase connector on 2026-11-10.
- Repository SQL files were fetched from GitHub `main`; their blob SHAs are available from GitHub.
- The live migration history does not contain original SQL checksums. Function/policy/view definitions can show current effects, but cannot prove the exact contents of a past migration.
- No migration repair, SQL apply, schema reset, data export, backup, or restore was performed in this audit.
