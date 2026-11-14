# Public Data API Write Boundary Plan

**Status:** source and live-catalog audit  
**Audit date:** 2026-11-10  
**Scope:** Supabase Data API writes from the public Next.js application  
**Hosted database changes:** none

## 1. Executive summary

The public app already routes most submissions through Next.js Route Handlers. Those handlers validate input, check feature flags and call a rate limiter before writing with the public Supabase client. The live database, however, still grants broad table privileges to anon and authenticated roles, and several public RLS policies permit direct INSERTs.

RLS is necessary, but a permissive INSERT policy cannot distinguish a request that passed through a Next.js Route Handler from a caller using PostgREST directly. A client with the public Supabase key can call PostgREST and bypass route-only validation, feature flags, honeypots and route rate limits.

The target is a database-enforced write contract for every public write operation:

1. Keep the Next.js route as the user-facing BFF: Zod validation, friendly error responses, feature flags, session resolution and additional abuse controls.
2. Move security-critical invariants and rate limits into a narrow database operation that cannot be bypassed by writing directly to a base table.
3. Revoke direct table DML only after every supported application flow uses its approved operation.
4. Preserve read access separately from write access. Use column-level grants and own-row policies where appropriate.
5. Test both the supported operation and the denied direct PostgREST path.

Do not solve this by adding a service-role key to browser code. The current web Vercel project has no service-role key in its environment. The admin Vercel project does have a service-role key in Production, Preview and Development; those non-production targets currently share the production database, which must be isolated before reusing privileged credentials in additional apps.

## 2. Live access model confirmed

The 2026-11-10 read-only catalog check found:

- All 37 public base tables have RLS enabled.
- The anon and authenticated roles nevertheless have broad table-level SELECT/INSERT/UPDATE/DELETE grants on most public tables. RLS still filters rows, but grants should be narrowed to the minimum operations actually required.
- Public INSERT policies currently exist on: leads, reviews, questions, answers, poll_votes, analytics_events, data_reports, page_submissions and question_upvotes.
- Some policies constrain status, but they do not enforce the Next.js route's full validation, rate limits, feature gates or relational checks.
- notification_reads and user_favorites have own-row policies. These are intentional user-scoped operations and should be kept distinct from anonymous public submissions.
- The live users table still has the older users_own_read_write FOR ALL policy. The column-scoped profile migration from PR #5 is in the repository but has not been applied to the hosted project.
- Table grants and RLS are separate controls: grants determine whether a role can reach an object, while RLS determines which rows and operations can succeed. See https://supabase.com/docs/guides/api/securing-your-api.

## 3. Public write-path inventory

| Operation / route | Current database write | Existing route-side controls | Live RLS / observed concern |
|---|---|---|---|
| POST /api/leads | leads INSERT | Zod and check_rate_limit | leads_public_insert accepts any row. Direct PostgREST bypasses route validation and rate limiting. |
| POST /api/reviews | reviews INSERT | honeypot, Zod, check_rate_limit, optional user identity | RLS only requires status=pending; direct callers bypass route controls. |
| POST /api/questions | questions INSERT | community_qa feature flag, Zod, rate limit, optional user identity | RLS only requires pending status; direct calls bypass feature gate and route checks. |
| POST /api/answers | answers INSERT | community_qa feature flag, Zod, rate limit | RLS only requires pending status; relation and business checks need DB coverage. |
| POST /api/polls/[id]/vote | poll_votes INSERT | polls feature flag, poll-active/expiry check, option belongs to poll, Zod, rate limit | Public INSERT policy is unconditional. Direct callers bypass poll and option checks. Unique (poll_id,voter_key) remains a useful backstop. |
| POST /api/analytics | analytics_events INSERT | Zod, metadata bounds, rate limit; drops event when limiter errors | Public INSERT policy is unconditional. Direct callers can write arbitrary event rows unless the DB validates them. |
| POST /api/data-reports | data_reports INSERT | Zod and rate limit | Public INSERT policy is unconditional; reporter IP and status must remain server/database-derived. |
| POST /api/page-submissions | page_submissions INSERT | Zod and rate limit | Public INSERT policy is unconditional; published-page/block validity and bounded payload need DB enforcement. |
| POST /api/questions/[id]/upvote | question_upvotes SELECT/INSERT/DELETE | feature flag, UUID/Zod, rate limit | SELECT and INSERT are public. No live DELETE policy exists, so unvote is expected to be rejected by RLS. Public SELECT also exposes raw voter_key values. |
| POST /api/blood-donors | register_blood_donor RPC | signed-in user, Zod, guarded RPC | The function has required domain checks. PR #8 removes the redundant direct INSERT path in source migrations; that migration is not applied to the hosted database. |
| POST /api/notifications/mark-read and mark-all-read | notification_reads UPSERT | requires a user session; server supplies user_id | Own-row policy matches intended access. Keep user-scoped, not anonymous. |
| Favorites API | user_favorites user-scoped writes | requires a user session | Existing own-row policy is the intended boundary. Keep ownership checks. |
| Account profile API | users UPDATE | requires a user session; route updates approved profile fields | PR #5 narrows privileges to approved columns in source migration. Hosted database still has the older policy until migration is safely deployed. |

Admin writes are a separate trust domain: they use the admin app's server-side service-role client and must be protected by active-admin checks on every mutating route. Do not reuse that credential in the public web app or in Preview/Development.

## 4. Specific findings

### 4.1 Donor registration bypass — source migration merged, hosted migration pending

The live blood_donors table had an authenticated own-row INSERT policy and an explicit table INSERT grant. Its verification_status column defaults to verified. A signed-in caller could therefore insert a row with their own user_id and consent_contact=true, omit verification status, and potentially appear in public_blood_donors without using the guarded registration RPC.

The normal user route already calls register_blood_donor(), which checks identity, consent, name, phone format, district location, duplicate listing and a 90-day phone rate limit.

PR #8 is merged at f1e14c5b37fbdfa5b7994c9accda8bbb07f2748d. Its migration drops the direct INSERT policy and revokes INSERT from PUBLIC, anon and authenticated, retaining authenticated RPC execution and service-role table access. Local replay, 45 pgTAP assertions and database lint passed. No hosted SQL has been applied.

### 4.2 Q&A upvote toggle — atomic RPC candidate

The prior live mismatch was confirmed: direct SELECT and INSERT were public, but no DELETE policy existed, so the unvote branch was expected to fail. The SELECT policy also exposed each raw voter_key.

A forward source migration now moves the operation to `public.toggle_question_upvote()`, a SECURITY INVOKER wrapper that calls a fixed SECURITY DEFINER implementation in the non-exposed `private` schema. The implementation repeats the community feature gate, verifies approved/non-deleted questions, validates the device UUID, serializes concurrent toggles, applies fixed IP/device rate buckets, and relies on the existing trigger for the counter update. Direct table SELECT/INSERT/UPDATE/DELETE is revoked from anon/authenticated/PUBLIC.

The route no longer selects or writes the table directly. The device key is still intentionally a bearer-style dedup token, not authenticated identity, consistent with the product spec's device-level engagement model.

**Candidate migration:** `20261114150000_atomic_question_upvote_rpc.sql` on the feature branch. It is not applied to the hosted database. Local pgTAP must prove both add and remove work as anon and the counter trigger increments/decrements. Before deployment, verify the hosted Data API exposed-schema list excludes `private`.

The live policy inventory exposes question_upvotes SELECT and INSERT, but no DELETE. The API route attempts DELETE when a device toggles an existing vote off. That branch is expected to fail under the live RLS policy. The public SELECT policy also reveals voter_key, which should not be treated as public data.

Do not fix this by simply restoring the historical FOR ALL policy: the older broad policy was deliberately removed in the security hardening migration because it allowed arbitrary UPDATE/DELETE.

### 4.3 Generic rate-limit RPC is not a safe public primitive

The live public.check_rate_limit(p_key,p_max_count,p_window) is SECURITY DEFINER and callable by anon/authenticated. It trusts caller-provided keys, limits and windows, counts then inserts non-atomically, and uses a public search_path. Any redesign must ensure clients cannot poison another caller's bucket or choose unbounded parameters. PR #7 made admin login fail closed and calls this RPC through the admin server-only service-role client; web submission routes still call the public RPC.

### 4.4 Preview/Development trust boundary

The vytanexa-admin Vercel project has SUPABASE_SERVICE_ROLE_KEY and VAPID_PRIVATE_KEY configured for Production, Preview and Development. Those targets currently share the production Supabase project. The vytanexa-web project did not have a service-role key in the latest environment metadata check.

Before adding privileged write credentials to the public app or expanding admin privileges, create a non-production Supabase target and isolate Preview/Development environment variables. Do not use a production service-role key in a Preview/Development deployment.

## 5. Target implementation pattern

For public submissions, keep a narrow Data API-facing function and put privileged implementation logic in the non-exposed private schema:

- Exposed wrapper: public.submit_<operation>(...), SECURITY INVOKER, with an empty search_path and fully qualified calls.
- Internal implementation: private.submit_<operation>_impl(...), SECURITY DEFINER only when required to write after direct table privileges are revoked; empty search_path; every relation and function schema-qualified; strict argument validation; no dynamic SQL.
- Grant wrapper EXECUTE only to the required Data API roles. Keep private out of the exposed schemas; do not create a directly callable SECURITY DEFINER endpoint in public.
- Grant the wrapper caller only the minimum private-schema USAGE/EXECUTE needed to invoke its internal function. Confirm private remains absent from the Data API exposed-schema allowlist.
- Internal implementations must independently enforce security-critical rules. Never trust client-supplied status, user_id, reporter_ip, created_at, verification_status or moderation/admin fields.
- Obtain signed-in identity with auth.uid(); derive IP from PostgREST request context, not an input argument. Supabase documents request context through current_setting('request.headers', true)::json, including x-forwarded-for: https://supabase.com/docs/guides/api/securing-your-api#accessing-request-information.
- Use a private atomic rate-limit implementation with fixed operation-specific caps and bounded key cardinality. Do not accept arbitrary client-selected max counts/windows or caller-selected cross-user bucket keys.
- Keep route-side Zod validation and rate limits for good UX and defense in depth. The database implementation remains the final gate against direct PostgREST/RPC calls.

For operations that require an app-only check (for example, a honeypot or a future CAPTCHA provider), do not assume a public RPC can prove the Next.js route ran. Add a short-lived, single-use server attestation or keep the operation behind a server-only authenticated channel. Never put the attestation secret in a client bundle.

A SECURITY DEFINER helper is privileged code. Set search_path = '', schema-qualify every referenced object, keep the exposed wrapper as an invoker, and test execution grants. See https://supabase.com/docs/guides/database/postgres/row-level-security.

## 6. Operation-by-operation database contract

| Operation | Required database invariants before direct DML can be revoked |
|---|---|
| Leads | New source RPC `submit_patient_lead()` validates a verified/non-deleted doctor, selected chamber ownership and active status, name/phone/preferred-time/message, derives user_id/source/status server-side, and enforces an atomic hashed phone+doctor 3/day limit. Direct client DML is revoked while authenticated own-lead SELECT remains. Local replay/pgTAP/typecheck pending. |
| Reviews | Entity type and entity existence match; rating 1–5; review text 20–500 chars; always pending; caller cannot set moderation fields; user identity derived from JWT; bounded phone/entity rate limit. |
| Questions | Feature flag enabled; bounded title/body; category valid/active; always pending; anonymous fields normalized; user identity derived from JWT; rate limit. |
| Answers | Feature flag enabled; target question exists, is visible and not deleted; bounded body; always pending; doctor identity must never be caller-asserted without verified-doctor authorization; rate limit. |
| Poll votes | Poll active, not deleted and not expired; option belongs to supplied poll; one vote per poll/voter key; voter key length/format bounded; IP/voter rate limit inside the operation. |
| Analytics | Allowlisted event types and entity types; metadata is an object with a strict byte/field limit; ignore/reject arbitrary user identity; rate limit; telemetry failure must not block the primary user flow. |
| Data reports | Entity type/id valid; reason allowlisted; detail length bounded; status always open; resolver fields always NULL; reporter IP derived from request context; rate limit. |
| Page submissions | Page exists and is published; block index belongs to the page; payload shape and byte size bounded; submitted phone validated; IP is server-derived; reject writes to deleted/unpublished pages. |
| Question upvotes | Candidate atomic RPC is now implemented in source: validates an approved question and feature flag, serializes the device toggle, applies fixed IP/device rate buckets, hides raw voter keys, and removes direct anon/authenticated table DML. Local replay/pgTAP/lint and route typecheck are pending. |
| Blood donors | Keep register_blood_donor() as the sole authenticated registration path; apply PR #8 migration only after the hosted DDL gate is cleared. |

## 7. Rollout sequence and release gates

1. Keep current PR #8 migration in source only. It is merged and locally tested, but do not apply it to the hosted database until backup/restore readiness is confirmed.
2. Implement and test the upvote RPC. Hide question_upvotes rows, prevent direct DML, preserve the public question counter, and add concurrent-toggle tests.
3. Continue with one public submission RPC at a time, starting with reviews after leads and upvotes. Keep existing API route response contracts stable.
4. Add negative-path tests: anon/authenticated direct INSERT/UPDATE/DELETE fail; SELECT only works where explicitly intended; approved RPC accepts valid data and rejects invalid data; spoofed status/user/IP values are ignored; rate limits are atomic under concurrent calls.
5. Audit every admin write route separately for active-admin authorization before service-role writes.
6. Narrow table grants after all current readers/writers and generated clients have been inventoried. Do not issue blanket revokes.
7. Run clean local Supabase migration replay, pgTAP, DB lint, app typechecks and route integration tests. Keep test data isolated.
8. Hosted DDL gate: verify current backup entitlement and take an off-project backup; perform a restore rehearsal before first hosted schema change. Supabase database backups do not include Storage object binaries, so Storage needs its own backup plan if buckets are introduced.
9. Environment gate: establish a staging Supabase project and separate Vercel Preview/Development credentials before any Preview deployment can perform privileged writes against production.
10. Post-deploy verification: test normal application flows and direct PostgREST attempts using real anon/authenticated JWTs, then rerun Supabase security/performance advisors.

## 8. Explicit non-actions in this audit

- No hosted Supabase migration or SQL DDL was applied.
- No live table privileges, RLS policies, functions, rows or Auth settings were changed.
- No Vercel environment variables or deployment-protection settings were changed.
- No service-role key was added to the public web project.
- PR #8 is a repository migration only until the backup/restore and staging gates are cleared.


## 9. Current implementation status — question upvotes

The feature branch `fix/atomic-question-upvote-rpc` adds `20261114150000_atomic_question_upvote_rpc.sql`, extends pgTAP to assert no direct upvote table privileges, verifies the public wrapper is SECURITY INVOKER and the private implementation is SECURITY DEFINER, and tests add/remove plus the count trigger under the anon role.

The web route now validates a device UUID and calls the RPC. It no longer reads raw rows or attempts a direct DELETE/INSERT. This is not yet merged or applied to the hosted database.

Before hosted deployment, verify that the Supabase API settings do not expose the `private` schema. The repository's local Supabase config exposes only `public` and `graphql_public`.


## 10. Current implementation status — patient lead submission

The feature branch `fix/secure-patient-lead-submission` adds `20261114160000_secure_patient_lead_submission.sql`. The public Route Handler now validates the request, applies an IP limit from the original browser request, and invokes the guarded RPC; it no longer writes to `leads` directly.

The database implementation independently validates the doctor, optional chamber, patient name/phone, preferred-time allowlist and message length. It derives `user_id` from the caller's auth context, writes fixed source/status values, and applies an atomic 3-per-phone/per-doctor/24-hour rate limit with a hashed phone key. Direct anon/authenticated table DML is revoked; authenticated SELECT for own-lead history remains.

The candidate adds pgTAP coverage for the permission boundary, wrapper/helper security modes, a valid guest submission, server-derived columns, doctor/chamber validation, preferred-time/phone/message rejection and the 3/day quota. It is not yet merged or applied to the hosted database.
