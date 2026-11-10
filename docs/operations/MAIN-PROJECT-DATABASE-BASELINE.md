# Main Supabase Project: Database Baseline & Safe Change Runbook

**Status:** Approved operating approach for the pre-launch phase  
**Last verified:** 2026-11-10  
**Scope:** Reconcile the existing Vytanexa Supabase project and harden it safely before public launch.

> **Environment decision:** Do not create a Supabase development branch or a second hosted Supabase project for this phase. Work against the existing main Vytanexa Supabase project. Use a disposable local PostgreSQL/Supabase stack for migration replay and tests where available. This document does not authorize destructive commands or unreviewed production changes.

## 1. Goals and guardrails

1. Keep the existing main Supabase project as the single authoritative hosted database.
2. Make its current schema and migration history reproducible from version control.
3. Reconcile every difference between repository migrations and the live migration ledger before adding more DDL.
4. Fix security issues with small, forward-only migrations and application PRs.
5. Verify every change and run Supabase advisors after DDL.
6. Preserve existing data, Auth users, and operational settings.

**Pre-launch is not the same as risk-free.** The main project is active and contains existing objects and records. Every live schema change must be treated as production-grade.

### Forbidden operations on the main project

- Never run `supabase db reset --linked`, DROP/RESET commands, or any command that recreates the remote database.
- Never apply a full schema baseline as a new migration to an already-populated project.
- Never edit or renumber a migration already recorded as applied.
- Never run a data import/seed copied from an unreviewed production dump.
- Never put service-role/secret keys, passwords, donor contact details, or user data in Git.
- Never make multiple unrelated security changes in one hard-to-review migration.

## 2. Verified baseline (2026-11-10)

### Main Supabase project

- Project status: `ACTIVE_HEALTHY`.
- PostgreSQL: major version 17 (reported build 17.6.1.141).
- Region: `ap-southeast-2` (Sydney); no region change is part of this milestone.
- Live migration ledger: **23 entries**.
- The user has chosen to work directly on this existing project; no hosted development branch is required.

### Repository

- Application SQL migrations are under `packages/database/migrations/`.
- The repository has **21 migration files**, numbered `0001` through `0021`.
- `DATABASE-SCHEMA.md` is stale: it omits live `blood_donors` columns including `user_id` and `verification_status`.
- The repository is not yet a verified canonical Supabase CLI migration layout.

### Known migration drift

| Repository file / observation | Live ledger observation | Required action |
| --- | --- | --- |
| `0017_fix_rate_limit_security_definer.sql` | No live entry with this name | Compare actual function definition, grants, and behavior; do not assume it was applied. |
| `0018_rate_limit_events_retention.sql` | Live entry named `rate_limit_events_retention` | Compare the exact SQL effect and record the mapping. |
| `0019_blood_donors_register_and_list_rpc.sql` | Live entry named `blood_donors_register_and_list_rpc` | Compare function body, grants, policies, and dependent view. |
| `0020_delete_my_account_rpc.sql` | Live entry named `delete_my_account_rpc` | Compare function body, grants, FK behavior, and side effects. |
| `0021_push_subscriptions.sql` | Live ledger reports it applied | Verify exact schema/function/policy state; then mark the repository documentation as applied. |

The live ledger also contains entries missing from the repository directory:

- `0017_blood_donors_login_gate`
- `0018_fix_blood_donors_view_security_invoker`
- `0019_fix_donor_insert_policy_perf`

Recover the exact historical SQL and provenance where possible. If exact SQL cannot be recovered, create a reviewed reconciliation/baseline record; do not invent old SQL or pretend a migration was previously applied.

## 3. One-project operating model

| Area | Decision |
| --- | --- |
| Hosted Supabase | Existing main Vytanexa project only |
| Supabase development branch | Not used |
| Second hosted staging project | Not used in this pre-launch phase |
| Migration replay | Disposable local PostgreSQL/Supabase database or CI service |
| Authoritative schema | Main project's verified live catalog + reconciled repository history |
| Schema deployment | Reviewed migration file, applied once to the main project |
| Application deployment | Separate PR/release checks; no automatic database reset or seed |

Preview/Development deployments currently need extra care because they may reach the same main Supabase project. Do not assume a Vercel Preview URL is private. Keep preview access restricted where possible, use synthetic test accounts/records, and do not run broad write/load tests against main. Vercel environment settings are a separate change and must be reviewed independently.

## 4. Main-project baseline capture (read-only first)

Before applying any DDL:

1. Capture the complete live migration ledger and archive the output with the audit timestamp.
2. Export a schema-only snapshot using the currently supported Supabase CLI/database tooling. Do not export user, donor, auth, or other personal data into the repository.
3. Capture catalog definitions for tables, columns, constraints, indexes, policies, views, triggers, functions, grants, and extension placement.
4. Run the Security and Performance advisors and save their findings.
5. Verify the project's available backup/restore point and retention in Supabase Dashboard before the first schema-changing operation. A schema dump is not a data backup.
6. Store only schema and non-sensitive migration metadata in Git. Keep operational backup artefacts in a private, access-controlled location.

Prefer a schema-only `db dump` for a read-only baseline. Be cautious with `db pull`: Supabase documentation states it can record a pulled baseline in the remote migration history. Review exact CLI behavior and flags before running it.

## 5. Migration reconciliation

Build a manifest with one row per repository SQL file and one row per live migration entry. Record:

- repository path and Git blob/commit SHA;
- live migration version and recorded name;
- exact SQL/effect match status;
- related live object definitions and grants;
- any dashboard/manual changes;
- recommended action (recover history, document mapping, or add a forward-only correction).

A matching name is not proof of equivalent SQL. Do not use `migration repair` merely to make the list look clean; only use it when the exact intended history and live effect have been established.

### Canonical workflow

1. Add and review Supabase CLI configuration in the repository without linking a destructive operation to main.
2. Recover and reconcile the historical SQL.
3. Replay the complete history against a disposable local database/CI database.
4. Fix replay errors without changing already-applied main-project history.
5. Generate new migration files using the installed Supabase CLI's `migration new` command; confirm syntax with `supabase --help` and relevant subcommand help first.
6. Review the SQL manually, including locks, data rewrites, grants, RLS, function search paths, and rollback implications.
7. Apply one reviewed migration to the main project using the Supabase migration workflow; never make an untracked dashboard-only schema change.
8. Verify the live objects and migration ledger immediately after application; run advisors again.

Use explicit target flags for every CLI command. Supabase CLI v3 changed default targeting behavior and asks for confirmation before hosted changes; pin the CLI version in CI and read the current CLI changelog before upgrading it. Never rely on implicit defaults.

## 6. Security remediation order

Prioritize the confirmed issues in small changes:

1. Remove unintended direct client INSERT/UPDATE paths on public submission tables; route writes through validated server boundaries.
2. Restrict public execution of `SECURITY DEFINER` functions. Keep only intentionally public RPCs, with fixed `search_path`, strict input validation, and explicit authorization.
3. Replace caller-controlled, non-atomic rate-limit logic with server-controlled, atomic limits.
4. Protect donor phone reveal with verified status, authorization, server-side throttling, and audit logging.
5. Harden push subscription registration/unregistration and protect the web-push sender against arbitrary endpoint targets.
6. Restrict user-editable access to account lifecycle/security columns.
7. Review intentionally server-only tables that have RLS enabled but no policies; document the intended service-role-only access.

Do not blanket-revoke every SECURITY DEFINER function. Review each function and its callers to avoid breaking account deletion, admin checks, donor registration, or legitimate public read functions.

## 7. Local/CI verification requirements

CI should use an isolated, disposable database container—not a hosted Supabase development branch—and must:

1. Replay all committed migrations from an empty database.
2. Compare the resulting schema with the expected snapshot.
3. Assert RLS is enabled for every exposed table.
4. Test grants and policies for `anon`, `authenticated`, owners, and admins.
5. Test sensitive RPCs for anonymous, non-owner, owner, and admin callers.
6. Test direct PostgREST writes as well as Next.js API route writes.
7. Test rate-limit concurrency, donor phone access, and push endpoint validation.
8. Run typecheck, lint, app builds, and Playwright smoke tests.
9. Run Supabase security/performance advisors and explicitly track accepted findings.

A successful Vercel build alone is not evidence that database permissions or RPC authorization are correct.

## 8. First-milestone exit criteria

- [ ] Main schema-only snapshot and full live migration ledger are captured.
- [ ] A recoverable backup/restore point is verified before DDL.
- [ ] All 23 live ledger entries are mapped to repository SQL or a reviewed history-reconciliation record.
- [ ] All 21 repository migration files are checked against the live schema effects.
- [ ] A clean local/CI database can replay the reconciled history.
- [ ] Generated database types and schema documentation match the verified main schema.
- [ ] No untracked schema changes remain.
- [ ] The highest-risk security findings have reviewed corrective migrations and tests.
- [ ] Each main-project migration has a review record and post-apply verification.

## 9. Product decisions

| Decision | Current position |
| --- | --- |
| First public language | English only; Bengali comes next, then Hindi, then further languages |
| Hosted database | Existing main Supabase project |
| Supabase development branch | Not required |
| Migration policy | Immutable applied history + forward-only corrections |
| Data policy | Preserve current data; no production data dumps in Git |
| Region | No change in this milestone |
