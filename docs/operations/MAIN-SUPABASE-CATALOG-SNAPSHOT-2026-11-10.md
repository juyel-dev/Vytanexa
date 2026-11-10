# Main Supabase Catalog Inventory

**Snapshot time:** 2026-11-10 (read-only inspection)  
**Project:** `lfrvzdhonsnemdfmxthw` — Vytanexa  
**Database:** PostgreSQL 17.6 (server build reported by Supabase: 17.6.1.141)  
**Region:** `ap-southeast-2`  
**Method:** Read-only PostgreSQL catalog queries via Supabase connector  
**Data exported:** No row contents, credentials, phone numbers, auth records, or donor records were exported.

> This is a catalog inventory, not a byte-for-byte `pg_dump --schema-only` artifact. It is a point-in-time reference for future drift comparison. Before the first DDL change, create and retain an actual schema-only dump plus a verified backup/restore point.

## 1. Database facts

| Metric | Observed value |
| --- | ---: |
| PostgreSQL version | 17.6 |
| Database size | 15,420,563 bytes (about 14.7 MiB) |
| Session timezone | UTC |
| Default search path | `"$user", public, extensions` |
| Public base tables | 37 |
| Public views | 3 |
| Public indexes | 136 |
| Public constraints | 121 |
| Public enum types | 11 |
| PostgreSQL-owned public application functions | 15 |
| Information-schema trigger event rows | 32 |

All 37 inspected public tables have RLS enabled. Four currently have no RLS policies: `audit_logs`, `push_subscriptions`, `rate_limit_events`, and `subscriptions`. Their apparent intended use is server/service-role-only, but that assumption must be tested against actual grants and callers.

## 2. Public table inventory

Every table has RLS enabled. Row counts are intentionally omitted because PostgreSQL statistics had not been freshly analyzed and were not reliable as record counts.

| Table | Columns |
| --- | ---: | ---: |
| `admin_users` | 8 | |
| `ads` | 12 | |
| `ambulance_services` | 16 | |
| `analytics_events` | 10 | |
| `answers` | 10 | |
| `app_settings` | 17 | |
| `articles` | 18 | |
| `audit_logs` | 9 | |
| `blood_bank_inventory` | 5 | |
| `blood_donors` | 12 | |
| `categories` | 11 | |
| `chambers` | 18 | |
| `custom_pages` | 15 | |
| `data_reports` | 10 | |
| `doctor_hospital_links` | 7 | |
| `doctors` | 26 | |
| `hospitals` | 28 | |
| `leads` | 13 | |
| `locations` | 12 | |
| `notification_reads` | 3 | |
| `notifications` | 11 | |
| `page_submissions` | 7 | |
| `poll_options` | 5 | |
| `poll_votes` | 5 | |
| `polls` | 9 | |
| `push_subscriptions` | 10 | |
| `question_upvotes` | 4 | |
| `questions` | 14 | |
| `rate_limit_events` | 3 | |
| `reviews` | 15 | |
| `subscription_plans` | 10 | |
| `subscriptions` | 11 | |
| `symptom_categories` | 4 | |
| `symptoms` | 13 | |
| `test_catalog` | 10 | |
| `user_favorites` | 5 | |
| `users` | 11 | |

## 3. Public views

All three views currently have `security_invoker=true`.

| View | Observed purpose |
| --- | --- |
| `location_paths` | Recursive location hierarchy with path IDs and depth |
| `public_blood_donors` | Verified, not-deleted, contact-consented donor directory; no phone column |
| `public_entity_tiers` | Active subscription tier by entity |

## 4. Enumerated types

| Enum | Values |
| --- | --- |
| `ad_placement` | `homepage_banner`, `native_feed` |
| `app_role` | `super_admin`, `admin`, `moderator`, `editor` |
| `entity_type` | `doctor`, `hospital`, `article`, `question`, `poll` |
| `hospital_type` | `hospital`, `clinic`, `diagnostic`, `nursing_home` |
| `lead_status` | `new`, `contacted`, `completed`, `cancelled`, `spam` |
| `location_type` | `state`, `district`, `sub_district`, `ward` |
| `moderation_status` | `pending`, `approved`, `rejected` |
| `notification_type` | `general`, `emergency`, `personal` |
| `subscription_status` | `active`, `expired`, `cancelled`, `trial` |
| `subscription_tier` | `free`, `basic`, `pro`, `premium` |
| `verification_status` | `pending`, `verified`, `rejected`, `suspended` |

## 5. Installed extensions

| Extension | Version | Schema |
| --- | --- | --- |
| `pg_stat_statements` | 1.11 | `extensions` |
| `pg_trgm` | 1.6 | `public` |
| `pgcrypto` | 1.3 | `extensions` |
| `plpgsql` | 1.0 | `pg_catalog` |
| `supabase_vault` | 0.3.1 | `vault` |
| `unaccent` | 1.1 | `public` |
| `uuid-ossp` | 1.1 | `extensions` |

Supabase Security Advisor warns about `pg_trgm` and `unaccent` being installed in `public`. Do not relocate them casually: trigram indexes and search SQL may depend on current operators/functions. Treat extension relocation as a separate tested migration.

## 6. Donor table catalog details

The live `public.blood_donors` table has 12 columns:

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| `id` | uuid | no | `gen_random_uuid()` |
| `name` | text | no | — |
| `phone` | text | no | — |
| `blood_group` | text | no | — |
| `location_id` | uuid | no | — |
| `last_donated_at` | date | yes | — |
| `consent_contact` | boolean | no | `false` |
| `created_at` | timestamptz | no | `now()` |
| `updated_at` | timestamptz | no | `now()` |
| `deleted_at` | timestamptz | yes | — |
| `user_id` | uuid | yes | — |
| `verification_status` | enum `verification_status` | no | `verified` |

**There is no `is_active` column.** Git commit [`683652c3f6a129929ba88ae2730ae6d2e157a5a9`](https://github.com/juyel-dev/Vytanexa/commit/683652c3f6a129929ba88ae2730ae6d2e157a5a9) records that `is_active` was deliberately dropped when `verification_status` was introduced.

Donor constraints:

- `blood_donors_pkey`: primary key `id`
- `blood_donors_location_id_fkey`: `location_id -> locations.id ON DELETE RESTRICT`
- `blood_donors_user_id_fkey`: `user_id -> auth.users.id ON DELETE SET NULL`
- `chk_blood_group`: restricts the eight valid ABO/Rh groups
- `chk_donor_consent`: requires `consent_contact = true`

Donor indexes:

- `blood_donors_pkey` on `id`
- `idx_blood_donors_status` on `verification_status` for non-deleted rows
- `idx_blood_donors_user` on non-null `user_id`
- `uq_blood_donors_one_per_user`: unique partial index on active `user_id`

The current `verification_status` default is `verified`; this matches the existing product behavior of instant publication with moderator suspension rather than an approval queue. Do not change this default without a product decision and UX review.

## 7. Rate-limit table catalog details

`public.rate_limit_events` has:

- `id`: bigint primary key
- `limit_key`: text
- `created_at`: timestamptz defaulting to `now()`

Indexes:

- `rate_limit_events_pkey`
- `idx_rate_limit_key_time` on `(limit_key, created_at DESC)`

RLS is enabled and no policies exist. Public and authenticated table privileges are still broadly granted, but RLS blocks direct row access. The exposed SECURITY DEFINER `check_rate_limit` RPC is the intended write path today and is itself a security finding.

## 8. Application function inventory

The inspected PostgreSQL-owned public functions are:

- `check_rate_limit(text, integer, interval)`
- `delete_my_account()`
- `get_donor_phone(uuid)`
- `get_trending_searches(integer)`
- `handle_new_auth_user()`
- `is_admin()`
- `list_blood_donors(text, uuid, integer)`
- `prune_push_subscriptions()`
- `recalc_entity_rating()`
- `recalc_poll_counts()`
- `recalc_question_counts()`
- `register_blood_donor(text, text, text, uuid, boolean)`
- `register_push_subscription(text, text, text, text, text)`
- `set_updated_at()`
- `unregister_push_subscription(text)`

Additional extension-owned functions in `public` are not included in this list. See the security audit for the SECURITY DEFINER exposure and required per-function review.

## 9. Backup and restore readiness

**Current backup availability is not verified.** The Supabase connector available to this audit can inspect Postgres catalog metadata and migration history, but it does not expose the project backup listing. No restore action was attempted.

Supabase's current documentation states:

- Pro, Team, and Enterprise projects receive automatic daily database backups.
- Free-plan projects should make regular CLI `db dump` exports and retain off-site backups.
- Daily database backups do not include binary objects stored through the Supabase Storage API.

Reference: [Supabase Database Backups](https://supabase.com/docs/guides/platform/backups).

A repository migration comment dated 2026-08-31 described Vytanexa as a free-tier project. That is historical repository evidence, not verified current billing state. Until the current plan and backup status are checked in **Supabase Dashboard → Database → Backups**, assume there is no verified recoverable backup.

**DDL gate:** No live schema migration should be applied until a current backup/restore point or a new logical backup is verified and stored off-site. Never use a restore action as a test; it overwrites the live project and causes downtime.

## 10. Snapshot limitations

- This inventory uses read-only catalog queries and is not a replacement for a CLI schema-only dump.
- Approximate row counts are PostgreSQL statistics, not exact counts; no row content was retrieved for this document.
- The snapshot excludes internal Supabase-managed schemas other than extension location references.
- It does not include Storage binary objects, Auth provider secrets, Vercel environment values, or backup files.
- No SQL, migration, data update, project setting, or deployment was changed during this snapshot.
