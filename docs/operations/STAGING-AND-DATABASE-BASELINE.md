# Staging Environment & Database Baseline

**Status:** Planning / first-milestone runbook  
**Last verified:** 2026-11-10  
**Scope:** Establish a safe non-production environment and make the database schema reproducible before application or security changes are shipped.

> This document is intentionally operational. It does not create a Supabase project/branch, alter Vercel settings, apply SQL, or change production data.

## 1. Goals

1. Ensure local development and Vercel Preview/Development deployments never use production credentials or production data.
2. Establish a staging database with synthetic fixtures and isolated auth, storage, and push-notification configuration.
3. Reconcile the repository's SQL migrations with the live database migration ledger before applying further DDL.
4. Make a clean database reproducible from version-controlled migrations.
5. Keep production unchanged until a reviewed migration has passed staging verification and an explicit release approval.

## 2. Verified baseline (2026-11-10)

### Supabase

- The Vytanexa production Supabase project is healthy and currently in region `ap-southeast-2` (Sydney).
- No Supabase development branches were present at the time of inspection.
- The live migration ledger contains **23 entries**.
- A Supabase development branch is expected to use an isolated database and **does not carry production data**. Treat its schema/bootstrap result as unverified until creation completes and the migration ledger is inspected.
- A development branch has a quoted compute rate. Obtain and disclose the current quote before creating it; do not assume the price is permanent.

### Repository

- SQL migrations are currently stored under `packages/database/migrations/`.
- The repository contains **21 SQL migration files**, numbered `0001` through `0021`.
- The current repository migration directory is not yet a verified canonical Supabase CLI project layout.
- `DATABASE-SCHEMA.md` is not a reliable substitute for a live schema snapshot; it is known to omit live columns on `blood_donors`.

### Migration drift to resolve

The repository and live ledger must not be treated as interchangeable yet.

| Repository migration file | Live-ledger observation | Required action |
| --- | --- | --- |
| `0017_fix_rate_limit_security_definer.sql` | No live entry with this migration name was present | Compare the SQL's intended effect with the actual live function definition and grants. Do not assume it was applied. |
| `0018_rate_limit_events_retention.sql` | Live ledger has `rate_limit_events_retention` under a different version/name | Compare full SQL effect and migration checksum/content; record the canonical mapping. |
| `0019_blood_donors_register_and_list_rpc.sql` | Live ledger entry is named `blood_donors_register_and_list_rpc` | Compare exact function, grants, policies, and view definitions. |
| `0020_delete_my_account_rpc.sql` | Live ledger entry is named `delete_my_account_rpc` | Compare exact function body, grants, FK behavior, and side effects. |
| `0021_push_subscriptions.sql` | Live ledger reports this migration as applied | Update repository documentation after confirming the live schema matches the file. |

The live ledger also contains entries absent from the repository migration directory:

- `0017_blood_donors_login_gate`
- `0018_fix_blood_donors_view_security_invoker`
- `0019_fix_donor_insert_policy_perf`

These must be recovered as immutable historical migrations or represented by an explicitly documented baseline/reconciliation mechanism. Do not silently rename, reorder, delete, or rewrite applied history.

## 3. Environment model

| Environment | Database | Credentials | Data |
| --- | --- | --- | --- |
| Local development | Local Supabase or dedicated disposable branch | Local-only keys | Synthetic fixtures |
| Vercel Development | Staging database | Staging publishable + server-only staging secret | Synthetic fixtures |
| Vercel Preview | Staging database | Staging publishable + server-only staging secret | Synthetic fixtures |
| Vercel Production | Existing production database | Production-only credentials | Production data |

Rules:

- Production service-role/secret keys must exist only in the Production target.
- Preview and Development must not fall back to production when a staging variable is absent. Fail closed with a clear startup/runtime error.
- Keep VAPID keys and push endpoints separate by environment. Staging must never send notifications to real users.
- Use separate OAuth callback URLs/provider configuration for staging where the provider requires them.
- Enable Vercel Deployment Protection for Preview deployments before sharing them externally.
- Do not copy personal, donor, authentication, or other production data into staging. Use synthetic fixtures only.
- Keep secrets in the platform's encrypted environment-variable store; never commit them to this repository or print their values in logs.

## 4. Staging bootstrap procedure

This section is gated: create the branch/project only after the current cost is shown and the owner explicitly approves any non-zero charge.

1. Choose the staging strategy: a Supabase development branch for a short-lived isolated environment, or a separate Supabase project for a durable staging environment. Confirm ownership, cost, region, and lifecycle.
2. For a development branch, create it from the production project only after the migration-drift implications are understood. Supabase branches do not copy production data.
3. Wait until the branch reports healthy/ready. Record its project reference, region, and creation time in the private operations record (not in this public repository).
4. Inspect its migration ledger and run read-only schema introspection. Confirm which migrations were actually applied and whether branch bootstrap completed cleanly.
5. Configure Vercel Preview and Development with staging-only URL, publishable key, server-only secret, auth settings, and push credentials. Preserve Production values unchanged.
6. Verify each deployment target independently. Confirm the resolved Supabase host at runtime without exposing keys.
7. Seed only synthetic test records; make donor/contact details obviously fictitious and disable all external notification delivery.
8. Run RLS, grants, RPC authorization, migration replay, and application smoke tests before using staging for feature work.

## 5. Migration reconciliation procedure

Do not apply a new production migration until all of the following are complete.

### A. Capture the actual database state

- Export the live schema using the supported Supabase CLI/database tooling.
- Capture the complete live migration ledger.
- Inspect definitions and privileges for every security-sensitive function, view, trigger, policy, and table grant.
- Record the actual columns, constraints, indexes, and foreign keys, including the live `blood_donors` fields.
- Treat production reads as read-only. Do not use destructive introspection or reset commands against production.

### B. Build an explicit mapping

For each repository migration and live ledger entry, record:

- repository path and Git blob/commit SHA;
- live migration version and recorded name;
- whether the live schema effect matches the repository SQL;
- any manual/dashboard changes not represented by a migration;
- the corrective migration required, if any.

A matching name alone is insufficient evidence that two migrations are equivalent.

### C. Establish one canonical migration workflow

- Adopt the Supabase CLI project configuration and standard migration workflow in a dedicated change.
- Preserve verified historical SQL as immutable.
- Recover missing historical migrations where their exact SQL can be established.
- If exact historical SQL cannot be recovered, document a reviewed baseline/reconciliation strategy; do not invent historical SQL and pretend it was applied.
- Use forward-only corrective migrations for drift. Never edit already-applied production migrations.
- Generate new migration files with the Supabase CLI, not hand-invented timestamp/version filenames.
- Test the full migration sequence against a fresh disposable database and the staging branch.
- Keep generated database types and schema documentation in sync with the verified result.

## 6. Required automated checks

The database baseline is not complete until CI can:

1. Start a clean disposable database.
2. Apply every committed migration in order without manual dashboard steps.
3. Verify the resulting schema against the expected snapshot.
4. Assert RLS is enabled on every exposed table.
5. Assert intended grants and policies for `anon`, `authenticated`, and server-only roles.
6. Test sensitive RPCs as anonymous, authenticated non-owner, owner, and administrator.
7. Confirm no production secrets are present in Preview/Development configuration.
8. Run Supabase security/performance advisors and require explicit review of remaining findings.

## 7. Exit criteria for milestone 1

- [ ] Staging environment exists, is healthy, and is isolated from production.
- [ ] Vercel Preview/Development point exclusively to staging; Production is unchanged.
- [ ] Preview deployments are protected.
- [ ] No production data or real notification endpoints exist in staging.
- [ ] Every live ledger entry has an explicit mapping to version-controlled history or a reviewed baseline record.
- [ ] A fresh database can be built from committed migrations.
- [ ] Schema snapshot and generated types match the verified database.
- [ ] CI migration, RLS, grant, and RPC authorization tests pass.

## 8. Explicit non-goals for this milestone

- No production DDL or data changes.
- No production region migration.
- No production service-role key rotation.
- No donor, auth, or push behavior changes.
- No automatic migration push or merge to production.
- No assumption that a successful Vercel build proves database or security correctness.

## 9. Decision log

| Decision | Current position |
| --- | --- |
| First public language | English only; Bengali, Hindi, and other languages are later releases |
| Production region | No change in this milestone |
| Staging data | Synthetic only |
| Deployment promotion | PR review and explicit release approval |
| Migration policy | Immutable history + forward-only corrections |
