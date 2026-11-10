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
| 18 | `20260905071637` | `0017_blood_donors_login_gate` | Historical source not committed in repo; corroborated by Git commit 683652c3 |
| 19 | `20260905071701` | `0018_fix_blood_donors_view_security_invoker` | Historical source not committed in repo; corroborated by Git commit 683652c3 |
| 20 | `20260905071730` | `0019_fix_donor_insert_policy_perf` | Historical source not committed in repo; corroborated by Git commit 683652c3 |
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
   - A later Git commit confirms the historical design: add `user_id`, add `verification_status`, and drop `is_active` rather than retaining both.
2. `20260905071701 / 0018_fix_blood_donors_view_security_invoker`
   - `public_blood_donors` is currently a view with `security_invoker=true`.
3. `20260905071730 / 0019_fix_donor_insert_policy_perf`
   - The donor own-insert policy uses a scalar subquery around `auth.uid()`.

### Historical source provenance

Git commit [`683652c3f6a129929ba88ae2730ae6d2e157a5a9`](https://github.com/juyel-dev/Vytanexa/commit/683652c3f6a129929ba88ae2730ae6d2e157a5a9), dated 2026-09-05, explicitly says that migrations 0017–0019 were applied to the live database via Supabase MCP. Its commit message documents these intended effects:

- `0017_blood_donors_login_gate`: add `user_id` referencing `auth.users` with `ON DELETE SET NULL`; add `verification_status`; remove `is_active`; add one-active-listing-per-account partial unique index; switch donor INSERT to authenticated own-row plus consent.
- `0018_fix_blood_donors_view_security_invoker`: retain `security_invoker=true` on `public_blood_donors`.
- `0019_fix_donor_insert_policy_perf`: wrap `auth.uid()` in a scalar subquery in the donor INSERT policy.

**Important limitation:** that Git commit's changed-file list does not include the three SQL migration files. The commit message corroborates the decisions and application, but does not provide the exact original SQL text. The live catalog confirms the resulting objects. Keep these as historical live-only migrations in the manifest; do not reconstruct source SQL from memory and claim it is byte-for-byte historical.

## 5. Donor contact function defect

The current live `get_donor_phone(uuid)` still references `blood_donors.is_active`. That column does not exist; the table has `verification_status`, `deleted_at` and `consent_contact`. A read-only call with a non-existent UUID returned PostgreSQL error `42703: column "is_active" does not exist`.

The historical source provenance above shows that dropping `is_active` was a deliberate schema decision. Therefore this is confirmed migration drift: the old function from migration 0012/0013 was not updated after donor lifecycle changed. A new forward-only correction is required.

## 6. Evidence and limitations

- Live state was queried directly through the Supabase connector on 2026-11-10.
- Repository SQL files were fetched from GitHub `main`; their blob SHAs are available from GitHub.
- The live migration history stores versions and names, not original SQL checksums.
- Function/policy/view definitions and Git commit messages show current effects and decisions, but do not prove the exact text of missing historical migrations.
- No migration repair, SQL apply, schema reset, data export, backup, or restore was performed in this audit.
