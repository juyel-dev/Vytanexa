# Main Supabase Project — Security Boundary Audit

**Audit date:** 2026-11-10  
**Environment:** Existing Vytanexa Supabase project `lfrvzdhonsnemdfmxthw`  
**Mode:** Read-only review of live catalog/advisors and the GitHub `main` source tree  
**Changes made to Supabase:** None

> Findings below are evidence from the inspected live database and repository source. They are not a substitute for a full penetration test. Potential abuse paths are labelled as such.

## 1. Critical functional defect — donor phone RPC references a missing column

The live function `public.get_donor_phone(uuid)` is a `SECURITY DEFINER` SQL function and contains this predicate:

```sql
AND is_active = true
AND deleted_at IS NULL
AND consent_contact = true
```

The live `public.blood_donors` table has columns `id, name, phone, blood_group, location_id, last_donated_at, consent_contact, created_at, updated_at, deleted_at, user_id, verification_status`. It does **not** have `is_active`.

A read-only call with a non-existent UUID was executed to force function planning. PostgreSQL returned:

```
ERROR: 42703: column "is_active" does not exist
CONTEXT: SQL function "get_donor_phone" during startup
```

Therefore the current donor contact route can fail before it can return a phone number. The route is `apps/web/src/app/api/blood-donors/[id]/contact/route.ts`.

**Required correction:** Replace the stale predicate with the actual lifecycle model, at minimum requiring `verification_status = 'verified'`, `deleted_at IS NULL`, and `consent_contact = true`. Add explicit caller authentication and a database-side per-user guard as defense in depth. Keep the API IP rate limit, but do not rely on it as the only protection because the RPC itself is callable by authenticated clients. Confirm the intended desktop response contract: the route's `?format=json` branch does return the phone in JSON, despite the older comment saying the number never appears in JSON.

This is a code/schema mismatch confirmed by a database error, not a hypothetical risk.

## 2. Public table writes bypass application route checks

The following live policies are granted to role `public` (therefore both anonymous and authenticated API roles where table privileges permit) and allow direct inserts:

| Table | Live INSERT policy |
| --- | --- |
| `leads` | `leads_public_insert`, `WITH CHECK (true)` |
| `reviews` | `reviews_public_insert`, requires pending status |
| `questions` | `questions_public_insert`, requires pending status |
| `answers` | `answers_public_insert`, requires pending status |
| `poll_votes` | `poll_votes_public_insert`, `WITH CHECK (true)` |
| `analytics_events` | `analytics_public_insert`, `WITH CHECK (true)` |
| `data_reports` | `data_reports_public_insert`, `WITH CHECK (true)` |
| `page_submissions` | `page_submissions_public_insert`, `WITH CHECK (true)` |
| `question_upvotes` | `upvotes_public_insert`, `WITH CHECK (true)` |

The same tables currently grant `anon` and `authenticated` broad table-level privileges including INSERT, UPDATE and DELETE (and, for the listed tables, REFERENCES/TRIGGER/TRUNCATE). RLS policies still constrain which rows can be touched, but a direct PostgREST request can skip the Next.js route altogether.

Examples of route-level controls that a direct PostgREST insert does not execute:

- `apps/web/src/app/api/leads/route.ts`: Zod validation and rate limiting.
- `apps/web/src/app/api/reviews/route.ts`: honeypot, Zod validation and rate limiting.
- `apps/web/src/app/api/questions/route.ts` and `answers/route.ts`: validation, feature checks and rate limiting.
- `apps/web/src/app/api/polls/[id]/vote/route.ts`: poll expiry, option-to-poll relationship checks and rate limiting.
- `apps/web/src/app/api/page-submissions/route.ts`: validation and rate limiting.
- `apps/web/src/app/api/data-reports/route.ts`: validation and rate limiting.
- `apps/web/src/app/api/analytics/route.ts`: payload-size cap and rate limiting.

**Required correction:** Establish a deliberate write boundary. Either move these writes behind trusted server-side operations with narrow database privileges, or make each exposed database operation independently enforce all required validation, ownership, feature-state, deduplication and rate limits. Then revoke direct table write privileges and overly permissive insert policies where the chosen architecture permits it. Do not revoke privileges before application callers have been migrated; that would break the current endpoints.

The web server's current Supabase client deliberately uses the anon key plus the user's cookie session. The web app does not have a service-role client. The admin app has a separate `server-only` service-role module. Any future write-boundary change must preserve this least-privilege separation rather than casually copying the service-role key into browser-facing code.

## 3. Rate-limit controls are exposed and several routes fail open

Live `public.check_rate_limit(text, integer, interval)`:

- is `SECURITY DEFINER`;
- fixes `search_path = public`;
- is executable by `PUBLIC`, `anon`, and `authenticated`;
- accepts a caller-chosen key, maximum count, and time window;
- performs count-then-insert rather than an atomic counter operation.

The live body currently also performs probabilistic retention cleanup. The table `rate_limit_events` has RLS enabled with no policies, but `anon` and `authenticated` still have broad table grants; direct table access is blocked by RLS, while the SECURITY DEFINER RPC can write rows.

Several API routes log a rate-limit RPC error and continue with the write instead of failing closed. Confirmed examples include leads, reviews, questions, answers, analytics, data reports, page submissions, polls and question upvotes. The donor contact route is different: it returns 503 on rate-limit error.

**Required correction:** Replace the caller-controlled public RPC with a trusted rate-limit boundary and atomic update semantics. Until that is ready, rate-limited routes should not silently accept writes after a limiter error. A temporary fail-closed route change is useful defense in depth, but does not close the direct-PostgREST bypass on its own.

## 4. Push subscription endpoints need an authorization and outbound-target boundary

Live function ACLs show both `register_push_subscription` and `unregister_push_subscription` executable by `anon` and `authenticated`.

- Registration accepts any URL beginning with `https://`; there is no push-service hostname allowlist in the function or the Next.js route's Zod schema.
- Registration upserts by endpoint and assigns the current `auth.uid()` (NULL for anonymous users).
- Unregistration deletes by endpoint only; it does not prove ownership of that subscription.
- `apps/admin/src/lib/web-push.ts` reads stored endpoints and calls `webpush.sendNotification` for each endpoint. No application-level endpoint-host allowlist is present in that sender.

This presents a **potential outbound request/SSRF surface**: an attacker who can register a crafted HTTPS endpoint may cause the admin sender to make an outbound request to it. Actual exploitability also depends on the `web-push` library's URL handling, network egress rules and DNS behavior; those have not yet been independently penetration-tested.

**Required correction:** Validate endpoints against the set of legitimate push-service origins, reject IP literals and private/reserved destinations after DNS resolution, handle DNS rebinding/redirect behavior, and revalidate immediately before sending. Require an ownership proof or authenticated ownership condition for unsubscribe/reassignment. The public RPCs should not remain generally callable unless their narrow capability contract is intentional and safe.

## 5. User profile row policy is broader than the application form

The live `public.users` policy `users_own_read_write` is `FOR ALL` with `auth.uid() = id`. `anon` and `authenticated` have broad table-level DML grants.

The profile PATCH route intentionally updates only `name`, `email`, `preferred_language`, and `default_location_id`. However the direct database permission model also makes other own-row fields reachable, including `phone`, `is_guest_converted`, `notification_prefs`, and `deleted_at`, subject to the same own-row policy.

**Required correction:** Replace broad `FOR ALL` with explicit SELECT and UPDATE permissions, and use column-level UPDATE grants or a narrow profile RPC for only the fields the user may edit. Keep verified phone changes and account lifecycle fields server-controlled.

## 6. Database functions and policy review inventory

The live Security Advisor reports:

- 4 RLS-enabled tables with no policies: `audit_logs`, `push_subscriptions`, `rate_limit_events`, `subscriptions`. These may be intentional service-role-only tables; document and test the expected access rather than adding permissive policies.
- 4 SECURITY DEFINER functions executable by `anon`: `check_rate_limit`, `get_trending_searches`, `register_push_subscription`, `unregister_push_subscription`.
- 9 SECURITY DEFINER functions executable by `authenticated`. Review individually; do not blanket-revoke functions that the app legitimately needs.
- Leaked-password protection is disabled.
- `pg_trgm` and `unaccent` are installed in `public`; evaluate a controlled extension-schema migration separately because search functions may depend on their current placement.

The live views `public_blood_donors`, `location_paths`, and `public_entity_tiers` currently have `security_invoker=true`.

## 7. Migration history reconciliation — observed source/effect status

The live ledger records versions and names, not the original SQL body. The following is the current evidence map, not a claim that the ledger contains source checksums.

| Repository SQL | Live state | Assessment |
| --- | --- | --- |
| `0017_fix_rate_limit_security_definer.sql` | No matching live ledger entry; a later live `rate_limit_events_retention` function has SECURITY DEFINER | The final effect exists in the current function, but this file's separate historical application is not evidenced. |
| `0018_rate_limit_events_retention.sql` | Live entry `rate_limit_events_retention`; current function body includes SECURITY DEFINER and probabilistic 7-day cleanup | Strong source/effect match; record exact source blob and live version in the migration manifest. |
| `0019_blood_donors_register_and_list_rpc.sql` | Live entry `blood_donors_register_and_list_rpc`; both RPC definitions and grants were inspected | Source/effect match observed. |
| `0020_delete_my_account_rpc.sql` | Live entry `delete_my_account_rpc`; function definition and grants were inspected | Source/effect match observed. |
| `0021_push_subscriptions.sql` | Live entry `0021_push_subscriptions`; table and RPC objects exist | Applied live. The file's opening comment incorrectly still says it is not yet applied; do not alter applied SQL history merely to fix its comment. |

Missing from the repository but present in the live ledger:

- `0017_blood_donors_login_gate`: current donor insert policy requires consent and `user_id = auth.uid()`; registration RPC also requires an authenticated user. Recover exact SQL if possible.
- `0018_fix_blood_donors_view_security_invoker`: current `public_blood_donors` view has `security_invoker=true`; recover exact SQL if possible.
- `0019_fix_donor_insert_policy_perf`: the current donor insert policy uses a scalar subquery for `auth.uid()`; this is consistent with the performance fix intent, but exact historical SQL is not recovered.

Do not edit already-applied migrations or use `migration repair` until the complete historical manifest is reviewed.

## 8. Implementation order

1. Fix the donor phone RPC contract and test the donor contact API end to end.
2. Design the public-write boundary and enumerate every route/table pair before changing grants.
3. Replace the public rate-limit RPC with a trusted, atomic implementation; then change every route to fail closed.
4. Secure push registration, unregistration and outbound delivery.
5. Narrow user profile column permissions.
6. Add DB integration tests for both direct PostgREST and Next.js API paths.
7. Apply reviewed forward-only migrations to the existing main project only after backup/restore readiness has been verified.

**No database changes were made during this audit.**


## 8. User profile least-privilege correction prepared

The live table-grant inventory confirmed that `anon` and `authenticated` had broad table DML on `public.users`, including column-level effective privileges for `phone`, `deleted_at` and `is_guest_converted`. The profile UI itself updates only name/email/language/default location, and the notification preferences route updates `notification_prefs`.

The forward-only migration `supabase/migrations/20261110130000_user_profile_column_permissions.sql` now prepares the correction for local replay: separate own-row SELECT/UPDATE policies, no direct INSERT/DELETE/TRUNCATE, and column-specific UPDATE grants for the five fields the app uses. It also adds a database CHECK that keeps emergency notifications enabled. A read-only count on the main project showed no existing user rows violating that emergency flag at audit time.

**The migration is not applied to main.** It must pass local replay, pgTAP and both app builds before the backup-gated hosted deployment.


## 9. API rate-limit outage behavior hardened

The current patch updates all eight public write routes that previously logged a `check_rate_limit()` RPC error and continued writing:

- leads
- reviews
- questions
- answers
- data reports
- page submissions
- poll votes
- question upvotes

Those routes now return HTTP 503 with their existing localized failure message and do not execute the INSERT/UPDATE/DELETE after a limiter error. The analytics endpoint keeps its fire-and-forget contract by silently dropping the event with HTTP 204 when the limiter is unavailable. The donor contact route was already fail-closed.

**Scope limitation:** This only fixes fail-open behavior when the route calls the limiter and it errors. It does not close direct PostgREST writes against permissive public policies, and it does not make the currently public `check_rate_limit()` RPC private or atomic. Those require a separate write-boundary redesign and tests that exercise direct PostgREST requests.


## 10. Admin login limiter now fails closed

Source tracing found that `apps/admin/src/app/api/admin/login/route.ts` logged rate-limit RPC errors but still proceeded to Supabase Auth. That meant an unavailable limiter could disable the login throttles at the highest-privilege entry point.

The forward source patch now:
- invokes both per-IP and per-email limiter checks through the existing `server-only` service-role client;
- keeps the cookie-backed anon client for Supabase Auth sign-in and the active-admin membership check;
- returns HTTP 503 if either limiter RPC errors or returns no decision;
- returns HTTP 429 if either limit is exhausted; and
- does not call `signInWithPassword` unless both checks explicitly return `true`.

This is an application-source change only. It does not modify the hosted database, change the public ACL of `check_rate_limit()`, or close direct PostgREST table writes. The remaining web routes still call the public rate-limit RPC and require a separate, complete server-side boundary migration before its public EXECUTE grant can be revoked.


## 11. Donor registration can bypass its guarded RPC

A read-only live-catalog check on 2026-11-10 confirmed:

- `authenticated_insert_own_donor` permits an authenticated user to INSERT a donor row when `consent_contact = true` and `user_id = auth.uid()`;
- the table ACL grants INSERT to `authenticated`;
- `verification_status` defaults to `'verified'`; and
- `public_blood_donors` exposes rows whose status is verified, which are not deleted, and whose contact consent is true.

The normal user route, `apps/web/src/app/api/blood-donors/route.ts`, calls `register_blood_donor()`. That SECURITY DEFINER function enforces authenticated identity, consent, name and phone validation, an active district location, one active listing per account, and a 90-day per-phone rate limit. Direct INSERT skips that entire contract and can create a verified row using the column default.

A forward-only candidate migration, `supabase/migrations/20261110150000_restrict_blood_donor_direct_insert.sql`, drops the direct INSERT policy, revokes table INSERT from `PUBLIC`, `anon`, and `authenticated`, and keeps the guarded RPC executable for authenticated users and the service role. The service role retains table INSERT for authorized admin workflows.

**The candidate migration is not applied to the hosted project.** Its local replay and pgTAP permission tests must pass before any hosted deployment is considered.

## 12. Q&A upvote toggle does not match the live DELETE policy

The live `question_upvotes` policies currently permit public SELECT and INSERT, but there is no DELETE policy. The table ACL grants DELETE to `anon` and `authenticated`, but RLS still denies a DELETE when no permissive DELETE policy exists.

However, `apps/web/src/app/api/questions/[id]/upvote/route.ts` implements a toggle: when an existing row is found it calls `.delete()`. Therefore, the unvote branch conflicts with the current live RLS policy and is expected to be rejected by PostgreSQL. This is a source/live behavior mismatch; a successful user-facing unvote has not been demonstrated.

The original `packages/database/migrations/0004_engagement.sql` contains an older `FOR ALL` policy, while the current live catalog has the narrower SELECT and INSERT policies. Do not assume the historical source file matches the live ACL/policy state. The upvote contract needs a dedicated fix and an integration test before changing its permissions.


## 13. Q&A upvote toggle moved behind an atomic RPC (PR #10 merged; hosted migration pending)

The new source migration `20261114150000_atomic_question_upvote_rpc.sql` replaces the direct SELECT/INSERT/DELETE flow with `public.toggle_question_upvote()`, a SECURITY INVOKER wrapper around a SECURITY DEFINER implementation in the non-exposed `private` schema.

The candidate implementation:
- repeats the `community_qa` feature check and requires an approved, non-deleted question;
- validates the per-device key as a UUID;
- serializes toggles for the device bucket with a transaction-scoped advisory lock;
- enforces a fixed 20-per-hour per-question device bucket in `rate_limit_events`; and
- keeps the per-IP bucket in the Next.js Route Handler, where the original browser request's client IP is available. The RPC itself is a separate server-to-server call and must not use its Vercel egress IP as the client key;
- adds/removes the matching row in one transaction, allowing the existing count trigger to update `questions.upvote_count`; and
- revokes direct SELECT/INSERT/UPDATE/DELETE on `question_upvotes` from PUBLIC, anon and authenticated, so raw device keys are no longer readable from PostgREST.

The API route now calls the RPC rather than selecting and mutating the table directly. It retains a route-level IP rate limit from the original browser request, while the database RPC has an atomic per-device limit. This split is intentional: the RPC's own request headers identify the Vercel server-to-server egress IP, which is shared by many users. Device-level dedup remains an intentional engagement safeguard, not proof of a unique human identity; a user can still clear local storage or use another browser.

The migration is merged in `main` through PR #10. Clean local replay, 65 pgTAP assertions, DB lint and both app typechecks passed. The hosted project must also be confirmed to expose only `public` and `graphql_public` (not `private`) before deployment. No hosted SQL has been applied.


## 14. Patient lead submission moved behind a guarded database RPC (PR #11 merged; hosted migration pending)

The previous live `leads_public_insert` policy allowed any anonymous/authenticated PostgREST caller to insert patient names and phone numbers directly. This bypassed the Next.js Zod schema and route-level rate limit, and allowed callers to choose sensitive lifecycle fields if table grants permitted them.

The new source migration `20261114160000_secure_patient_lead_submission.sql`:
- adds a SECURITY INVOKER public wrapper around a private SECURITY DEFINER implementation;
- verifies the doctor is verified and not deleted;
- verifies a selected chamber belongs to that doctor and is active/non-deleted;
- repeats the name, Indian mobile, preferred-time allowlist and message-length validations in PostgreSQL;
- derives `user_id` from `auth.uid()` and fixes source/status in the database;
- enforces an atomic 3-per-phone/per-doctor/24-hour limit using a hashed rate key and transaction advisory lock; and
- drops the direct INSERT policy, revokes all client DML, and restores SELECT only to authenticated users for own-lead history.

The Route Handler now applies a separate per-IP limit using the original browser request, then calls the RPC. It does not use the Supabase server-to-server request headers as the browser's IP.

The migration and route are merged in `main` through PR #11. Clean local replay, 96 pgTAP assertions, DB lint, both app typechecks and Preview checks passed. No hosted SQL has been applied.


## 15. Review submission and reviewer privacy hardening (PR #12 merged; hosted migration pending)

A read-only live catalog check confirmed that the public review SELECT grant was table-wide even though `reviewer_phone` is explicitly private in the source schema. The table also contains `user_id`, `moderated_by`, and `moderated_at`, which are not needed to render public review cards. Public RLS restricted rows to approved reviews and the caller's own rows, but RLS alone did not hide those columns from callers who could see a row.

The candidate migration `supabase/migrations/20261114170000_secure_review_submission_and_reads.sql`:
- adds `public.submit_review()`, a SECURITY INVOKER wrapper around private validation/write logic;
- validates doctor/hospital existence and verified/non-deleted status, reviewer name, integer rating 1–5, and review text length;
- derives authenticated `user_id` from `auth.uid()`, sets all moderation fields to safe defaults, and does not accept phone or status from the caller;
- removes direct client INSERT/UPDATE/DELETE;
- replaces table-wide SELECT with column grants for the public review-card fields and status filter, withholding reviewer phone, user id and moderation metadata;
- adds `public.get_my_reviews()`, an authenticated SECURITY INVOKER wrapper around a private SECURITY DEFINER query that uses `auth.uid()` internally and does not return user ids.

The app route preserves the honeypot, applies a hashed per-IP/entity limit from the original browser request, and calls the guarded RPC. The account review page now uses the own-review RPC rather than selecting/filtering the private user_id column.

**Known residual limitation:** the RPC remains callable by anon to preserve guest reviews. The database has a 3-per-24-hour per-entity key based on a hash of the guest display name, but guests can vary the name to bypass that fallback when calling the RPC directly. The normal Next.js route applies a hashed IP limiter, but a direct PostgREST RPC caller skips that route-level check. This is not a complete anonymous anti-spam boundary; before production, choose a CAPTCHA/short-lived server-attestation or IP-aware edge-function design. Do not describe the guest name bucket as a strong identity limit.

The migration and route are merged in `main` through PR #12. Clean local replay, 143 pgTAP assertions, DB lint, both app typechecks and Preview checks passed. No hosted SQL has been applied.


## 16. Community Q&A submission and author privacy hardening (source candidate)

The live Questions and Answers INSERT policies allow any public caller to insert a row with `status='pending'`. Those policies do not enforce `community_qa`, route validation, active category checks, approved parent-question checks, or database-derived author identity. The public Questions detail query also used `SELECT *`, which exposed private `author_phone` and `user_id` columns from approved question rows.

The new source migration `supabase/migrations/20261114180000_secure_community_qa_submissions.sql`:
- adds `submit_question()` and `submit_answer()` SECURITY INVOKER wrappers around private SECURITY DEFINER implementations;
- repeats the `community_qa` feature flag in PostgreSQL;
- validates question title/body, active category, optional author phone and name, and answer body/name;
- requires an answer's parent question to be approved and not deleted;
- derives `user_id` using `auth.uid()`, fixes new records to pending, prevents public answers from setting `doctor_id`, and forces `author_name=NULL` whenever a question is marked anonymous;
- revokes direct client DML from Questions and Answers;
- grants only safe public display columns to anon/authenticated, hiding Questions author_phone/user_id/deleted_at and Answers user_id; and
- adds `get_my_questions()` so account history uses `auth.uid()` without selecting/filtering the private user_id column.

The public Question Detail query now selects explicit safe columns rather than `*`. Both submission routes retain Zod validation and hashed route-level IP buckets, then invoke the guarded RPC. The own-question account queries use the new RPC. When `is_anonymous=true`, the database forces the public `author_name` field to NULL even if a direct caller supplied a value. A read-only live count found 4 question rows total and zero anonymous rows with a populated author name, author phone or user id, so no existing production row required backfill.

**Known residual limitation:** guest direct-RPC callers can vary display names or content to avoid the database's fallback name/content bucket. The normal Next.js route enforces per-IP limits, but direct PostgREST RPC requests bypass that HTTP route limiter. Before treating anonymous Q&A abuse controls as production complete, use CAPTCHA/short-lived server attestation or an IP-aware edge boundary.

This is a source branch candidate pending local replay, pgTAP, DB lint and web/admin typecheck. No hosted SQL has been applied.
