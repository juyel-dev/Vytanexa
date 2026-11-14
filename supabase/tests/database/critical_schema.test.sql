-- Critical database contract tests for the main-project migration baseline.
-- Run only against the disposable local stack via: npm run db:test

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

BEGIN;
SELECT plan(207);

SELECT ok(
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'blood_donors'
      AND column_name = 'verification_status'
  ),
  'blood_donors has the verification_status lifecycle column'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'blood_donors'
      AND column_name = 'is_active'
  ),
  'blood_donors does not retain the removed is_active column'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'public_blood_donors'
      AND c.relkind = 'v'
  ),
  'public_blood_donors view exists'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'public_blood_donors'
      AND c.reloptions @> ARRAY['security_invoker=true']
  ),
  'public_blood_donors is SECURITY INVOKER'
);

SELECT ok(
  pg_get_functiondef('public.get_donor_phone(uuid)'::regprocedure) NOT ILIKE '%is_active%',
  'get_donor_phone no longer references the removed is_active column'
);

SELECT ok(
  pg_get_functiondef('public.get_donor_phone(uuid)'::regprocedure) ILIKE '%verification_status%'
    AND pg_get_functiondef('public.get_donor_phone(uuid)'::regprocedure) ILIKE '%consent_contact%'
    AND pg_get_functiondef('public.get_donor_phone(uuid)'::regprocedure) ILIKE '%deleted_at%',
  'get_donor_phone enforces verification, contact consent and deletion state'
);

SELECT ok(
  EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'private'),
  'private schema exists for internal database helpers'
);

SELECT ok(
  has_schema_privilege('anon', 'private', 'USAGE'),
  'anon can reach only explicitly granted helpers in the non-exposed private schema'
);

SELECT ok(
  has_schema_privilege('authenticated', 'private', 'USAGE'),
  'authenticated can reach only explicitly granted helpers in the non-exposed private schema'
);

SELECT ok(
  NOT has_function_privilege(
    'anon',
    'private.consume_donor_phone_rate_limit(uuid)'::regprocedure,
    'EXECUTE'
  ),
  'anon cannot execute the internal donor rate limiter'
);

SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'private.consume_donor_phone_rate_limit(uuid)'::regprocedure,
    'EXECUTE'
  ),
  'authenticated cannot execute the internal donor rate limiter'
);

SELECT ok(
  NOT has_function_privilege(
    'service_role',
    'private.consume_donor_phone_rate_limit(uuid)'::regprocedure,
    'EXECUTE'
  ),
  'service_role cannot call the private donor rate limiter directly'
);

SELECT ok(
  NOT has_function_privilege(
    'anon',
    'public.get_donor_phone(uuid)'::regprocedure,
    'EXECUTE'
  ),
  'anon cannot execute donor phone reveal'
);

SELECT ok(
  has_function_privilege(
    'authenticated',
    'public.get_donor_phone(uuid)'::regprocedure,
    'EXECUTE'
  ),
  'authenticated users can call donor phone reveal through its guarded contract'
);

SELECT ok(
  has_function_privilege(
    'service_role',
    'public.get_donor_phone(uuid)'::regprocedure,
    'EXECUTE'
  ),
  'service_role retains server-side donor phone RPC access'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.public_blood_donors', 'SELECT'),
  'anon has no SELECT grant on the donor directory view'
);

SELECT ok(
  has_table_privilege('authenticated', 'public.public_blood_donors', 'SELECT'),
  'authenticated retains SELECT on the donor directory view'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'blood_donors'
      AND policyname = 'authenticated_insert_own_donor'
  ),
  'direct authenticated donor INSERT policy is removed'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'blood_donors'
      AND policyname = 'public_insert_donor'
  ),
  'legacy anonymous donor insert policy is absent'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.blood_donors', 'INSERT'),
  'anonymous clients cannot insert donor rows directly'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.blood_donors', 'INSERT'),
  'authenticated clients must use the guarded donor registration RPC'
);

SELECT ok(
  has_table_privilege('service_role', 'public.blood_donors', 'INSERT'),
  'server-side admin workflows retain donor INSERT access'
);

SELECT ok(
  has_function_privilege(
    'authenticated',
    'public.register_blood_donor(text,text,text,uuid,boolean)'::regprocedure,
    'EXECUTE'
  ),
  'authenticated users retain the guarded donor registration RPC'
);

SELECT ok(
  NOT has_function_privilege(
    'anon',
    'public.register_blood_donor(text,text,text,uuid,boolean)'::regprocedure,
    'EXECUTE'
  ),
  'anonymous users cannot register donors without an account'
);

-- Question upvotes are now available only through a narrow atomic RPC.
SELECT ok(
  NOT has_table_privilege('anon', 'public.question_upvotes', 'SELECT'),
  'anonymous users cannot read raw question upvote rows or device keys'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.question_upvotes', 'INSERT'),
  'anonymous users cannot insert question upvotes directly'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.question_upvotes', 'UPDATE'),
  'anonymous users cannot update question upvotes directly'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.question_upvotes', 'DELETE'),
  'anonymous users cannot delete question upvotes directly'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.question_upvotes', 'SELECT'),
  'authenticated users cannot read raw question upvote rows or device keys'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.question_upvotes', 'INSERT'),
  'authenticated users cannot insert question upvotes directly'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.question_upvotes', 'UPDATE'),
  'authenticated users cannot update question upvotes directly'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.question_upvotes', 'DELETE'),
  'authenticated users cannot delete question upvotes directly'
);

SELECT ok(
  has_function_privilege(
    'anon',
    'public.toggle_question_upvote(uuid,text)'::regprocedure,
    'EXECUTE'
  ),
  'anonymous users can toggle their vote through the guarded public RPC'
);

SELECT ok(
  has_function_privilege(
    'authenticated',
    'public.toggle_question_upvote(uuid,text)'::regprocedure,
    'EXECUTE'
  ),
  'authenticated users can toggle their vote through the guarded public RPC'
);

SELECT ok(
  has_function_privilege(
    'anon',
    'private.toggle_question_upvote_impl(uuid,text)'::regprocedure,
    'EXECUTE'
  ),
  'anonymous wrapper callers can execute the one granted private upvote implementation'
);

SELECT ok(
  has_function_privilege(
    'authenticated',
    'private.toggle_question_upvote_impl(uuid,text)'::regprocedure,
    'EXECUTE'
  ),
  'authenticated wrapper callers can execute the one granted private upvote implementation'
);

SELECT ok(
  has_table_privilege('service_role', 'public.question_upvotes', 'INSERT'),
  'service_role retains table INSERT for trusted server-side maintenance'
);

SELECT ok(
  NOT (
    SELECT prosecdef
    FROM pg_proc
    WHERE oid = 'public.toggle_question_upvote(uuid,text)'::regprocedure
  ),
  'public upvote wrapper is SECURITY INVOKER, not SECURITY DEFINER'
);

SELECT ok(
  (
    SELECT prosecdef
    FROM pg_proc
    WHERE oid = 'private.toggle_question_upvote_impl(uuid,text)'::regprocedure
  ),
  'private upvote implementation is SECURITY DEFINER for the trigger-maintained counter'
);

UPDATE public.app_settings
SET features = pg_catalog.jsonb_set(features, '{community_qa}', 'true'::jsonb, true)
WHERE id = 1;

INSERT INTO public.questions (id, title, status)
VALUES (
  '00000000-0000-0000-0000-000000000091',
  'pgTAP question upvote RPC fixture',
  'approved'::public.moderation_status
);

SET LOCAL ROLE anon;
SELECT is(
  public.toggle_question_upvote(
    '00000000-0000-0000-0000-000000000091'::uuid,
    '00000000-0000-0000-0000-000000000092'
  ),
  '{"upvoted": true}'::jsonb,
  'anonymous caller can create a question upvote through the RPC'
);
RESET ROLE;

SELECT is(
  (SELECT upvote_count FROM public.questions
   WHERE id = '00000000-0000-0000-0000-000000000091'::uuid),
  1,
  'upvote trigger increments the denormalized question count'
);

SET LOCAL ROLE anon;
SELECT is(
  public.toggle_question_upvote(
    '00000000-0000-0000-0000-000000000091'::uuid,
    '00000000-0000-0000-0000-000000000092'
  ),
  '{"upvoted": false}'::jsonb,
  'the same device can remove its vote through the RPC'
);
RESET ROLE;

SELECT is(
  (SELECT upvote_count FROM public.questions
   WHERE id = '00000000-0000-0000-0000-000000000091'::uuid),
  0,
  'upvote trigger decrements the denormalized question count after unvoting'
);

UPDATE public.app_settings
SET features = pg_catalog.jsonb_set(features, '{community_qa}', 'false'::jsonb, true)
WHERE id = 1;

SET LOCAL ROLE anon;
SELECT is(
  public.toggle_question_upvote(
    '00000000-0000-0000-0000-000000000091'::uuid,
    '00000000-0000-0000-0000-000000000092'
  ),
  '{"error": "feature_disabled"}'::jsonb,
  'the database RPC rejects upvotes when community Q&A is disabled'
);
RESET ROLE;

SELECT ok(
  (SELECT prosecdef FROM pg_proc
   WHERE oid = 'public.register_blood_donor(text,text,text,uuid,boolean)'::regprocedure),
  'donor registration remains a SECURITY DEFINER function'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = false
  ),
  'all public base tables have row-level security enabled'
);

SELECT throws_ok(
  $$ SELECT public.get_donor_phone('00000000-0000-0000-0000-000000000000'::uuid) $$,
  '42501',
  'authentication_required',
  'unauthenticated direct donor phone RPC calls are rejected'
);


SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'users_own_read_write'
  ),
  'legacy FOR ALL user profile policy is removed'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'users_own_select'
      AND cmd = 'SELECT'
      AND roles @> ARRAY['authenticated'::name]
  ),
  'authenticated users have an own-row SELECT policy'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'users_own_profile_update'
      AND cmd = 'UPDATE'
      AND roles @> ARRAY['authenticated'::name]
  ),
  'authenticated users have an own-row UPDATE policy'
);

SELECT ok(
  has_table_privilege('authenticated', 'public.users', 'SELECT'),
  'authenticated users retain profile SELECT'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.users', 'SELECT'),
  'anonymous users cannot read profile rows'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.users', 'UPDATE'),
  'authenticated users have no table-level UPDATE privilege'
);

SELECT ok(
  has_column_privilege('authenticated', 'public.users', 'name', 'UPDATE'),
  'authenticated users can update profile name'
);

SELECT ok(
  has_column_privilege('authenticated', 'public.users', 'email', 'UPDATE'),
  'authenticated users can update profile email'
);

SELECT ok(
  has_column_privilege('authenticated', 'public.users', 'preferred_language', 'UPDATE'),
  'authenticated users can update preferred language'
);

SELECT ok(
  has_column_privilege('authenticated', 'public.users', 'default_location_id', 'UPDATE'),
  'authenticated users can update default location'
);

SELECT ok(
  has_column_privilege('authenticated', 'public.users', 'notification_prefs', 'UPDATE'),
  'authenticated users can update notification preferences'
);

SELECT ok(
  NOT has_column_privilege('authenticated', 'public.users', 'phone', 'UPDATE'),
  'authenticated users cannot self-edit verified phone'
);

SELECT ok(
  NOT has_column_privilege('authenticated', 'public.users', 'deleted_at', 'UPDATE'),
  'authenticated users cannot self-edit account deletion state'
);

SELECT ok(
  NOT has_column_privilege('authenticated', 'public.users', 'is_guest_converted', 'UPDATE'),
  'authenticated users cannot self-edit guest-conversion state'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.users', 'INSERT'),
  'authenticated users cannot insert profile rows directly'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.users', 'DELETE'),
  'authenticated users cannot delete profile rows directly'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.users', 'TRUNCATE'),
  'authenticated users cannot truncate profile rows'
);


SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass
      AND conname = 'users_emergency_notifications_always_on'
  ),
  'database enforces emergency notifications as always enabled'
);

-- Patient leads are writable only through the validated RPC.
SELECT ok(
  NOT has_table_privilege('anon', 'public.leads', 'INSERT'),
  'anonymous callers cannot insert patient leads directly'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.leads', 'INSERT'),
  'authenticated callers cannot insert patient leads directly'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.leads', 'SELECT'),
  'anonymous callers cannot read patient lead rows'
);

SELECT ok(
  has_table_privilege('authenticated', 'public.leads', 'SELECT'),
  'authenticated users retain table SELECT for own-lead history'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.leads', 'UPDATE'),
  'anonymous callers cannot update patient leads directly'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.leads', 'UPDATE'),
  'authenticated callers cannot update patient leads directly'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.leads', 'DELETE'),
  'anonymous callers cannot delete patient leads directly'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.leads', 'DELETE'),
  'authenticated callers cannot delete patient leads directly'
);

SELECT ok(
  has_table_privilege('service_role', 'public.leads', 'INSERT'),
  'trusted service_role retains lead INSERT for admin workflows'
);

SELECT ok(
  has_function_privilege(
    'anon',
    'public.submit_patient_lead(uuid,uuid,text,text,text,text)'::regprocedure,
    'EXECUTE'
  ),
  'anonymous callers can submit leads through the guarded public RPC'
);

SELECT ok(
  has_function_privilege(
    'authenticated',
    'public.submit_patient_lead(uuid,uuid,text,text,text,text)'::regprocedure,
    'EXECUTE'
  ),
  'authenticated callers can submit leads through the guarded public RPC'
);

SELECT ok(
  has_function_privilege(
    'anon',
    'private.submit_patient_lead_impl(uuid,uuid,text,text,text,text)'::regprocedure,
    'EXECUTE'
  ),
  'anonymous wrapper callers can execute the one granted private lead implementation'
);

SELECT ok(
  has_function_privilege(
    'authenticated',
    'private.submit_patient_lead_impl(uuid,uuid,text,text,text,text)'::regprocedure,
    'EXECUTE'
  ),
  'authenticated wrapper callers can execute the one granted private lead implementation'
);

SELECT ok(
  NOT (
    SELECT prosecdef
    FROM pg_proc
    WHERE oid = 'public.submit_patient_lead(uuid,uuid,text,text,text,text)'::regprocedure
  ),
  'public patient lead wrapper is SECURITY INVOKER'
);

SELECT ok(
  (
    SELECT prosecdef
    FROM pg_proc
    WHERE oid = 'private.submit_patient_lead_impl(uuid,uuid,text,text,text,text)'::regprocedure
  ),
  'private patient lead implementation is SECURITY DEFINER'
);

-- Minimal, isolated fixtures for valid/invalid doctor and chamber checks.
INSERT INTO public.categories (id, slug, name_translations)
VALUES (
  '00000000-0000-0000-0000-000000000101',
  'pgtap-lead-category',
  '{"en":"Lead test category"}'::jsonb
);

INSERT INTO public.locations (id, type, slug, name_translations)
VALUES (
  '00000000-0000-0000-0000-000000000102',
  'state'::public.location_type,
  'pgtap-lead-state',
  '{"en":"Lead test state"}'::jsonb
);

INSERT INTO public.doctors (id, slug, category_id, name_translations, verification_status)
VALUES
(
  '00000000-0000-0000-0000-000000000103',
  'pgtap-lead-doctor',
  '00000000-0000-0000-0000-000000000101',
  '{"en":"Verified lead test doctor"}'::jsonb,
  'verified'::public.verification_status
),
(
  '00000000-0000-0000-0000-000000000105',
  'pgtap-other-lead-doctor',
  '00000000-0000-0000-0000-000000000101',
  '{"en":"Other verified lead test doctor"}'::jsonb,
  'verified'::public.verification_status
),
(
  '00000000-0000-0000-0000-000000000107',
  'pgtap-pending-lead-doctor',
  '00000000-0000-0000-0000-000000000101',
  '{"en":"Pending lead test doctor"}'::jsonb,
  'pending'::public.verification_status
);

INSERT INTO public.chambers (
  id, doctor_id, chamber_name, location_id, address_line, phone
)
VALUES
(
  '00000000-0000-0000-0000-000000000104',
  '00000000-0000-0000-0000-000000000103',
  'Lead test chamber',
  '00000000-0000-0000-0000-000000000102',
  '1 Test Road',
  '9876543210'
),
(
  '00000000-0000-0000-0000-000000000106',
  '00000000-0000-0000-0000-000000000105',
  'Other doctor chamber',
  '00000000-0000-0000-0000-000000000102',
  '2 Test Road',
  '9876543211'
);

SET LOCAL ROLE anon;
SELECT is(
  public.submit_patient_lead(
    '00000000-0000-0000-0000-000000000103'::uuid,
    '00000000-0000-0000-0000-000000000104'::uuid,
    '  Lead Test Patient  ',
    ' 9876543210 ',
    'morning',
    '  Test request  '
  ),
  '{"success": true}'::jsonb,
  'anonymous caller can submit a valid patient lead through the RPC'
);
RESET ROLE;

SELECT ok(
  (
    SELECT user_id IS NULL
    FROM public.leads
    WHERE doctor_id = '00000000-0000-0000-0000-000000000103'::uuid
      AND patient_phone = '9876543210'
    LIMIT 1
  ),
  'guest lead records do not accept a caller-supplied user identity'
);

SELECT is(
  (
    SELECT patient_name
    FROM public.leads
    WHERE doctor_id = '00000000-0000-0000-0000-000000000103'::uuid
      AND patient_phone = '9876543210'
    LIMIT 1
  ),
  'Lead Test Patient',
  'database trims the patient name before storing it'
);

SELECT is(
  (
    SELECT patient_phone
    FROM public.leads
    WHERE doctor_id = '00000000-0000-0000-0000-000000000103'::uuid
      AND patient_phone = '9876543210'
    LIMIT 1
  ),
  '9876543210',
  'database trims and normalizes the patient phone before storing it'
);

SELECT is(
  (
    SELECT source
    FROM public.leads
    WHERE doctor_id = '00000000-0000-0000-0000-000000000103'::uuid
      AND patient_phone = '9876543210'
    LIMIT 1
  ),
  'profile_page',
  'lead source is assigned by the database, not by the caller'
);

SELECT is(
  (
    SELECT status::text
    FROM public.leads
    WHERE doctor_id = '00000000-0000-0000-0000-000000000103'::uuid
      AND patient_phone = '9876543210'
    LIMIT 1
  ),
  'new',
  'lead moderation status is assigned by the database'
);

SELECT is(
  (
    SELECT chamber_id
    FROM public.leads
    WHERE doctor_id = '00000000-0000-0000-0000-000000000103'::uuid
      AND patient_phone = '9876543210'
    LIMIT 1
  ),
  '00000000-0000-0000-0000-000000000104'::uuid,
  'lead records the selected chamber belonging to the requested doctor'
);

SELECT is(
  (
    SELECT preferred_time
    FROM public.leads
    WHERE doctor_id = '00000000-0000-0000-0000-000000000103'::uuid
      AND patient_phone = '9876543210'
    LIMIT 1
  ),
  'morning',
  'lead stores one of the four permitted preferred-time values'
);

SET LOCAL ROLE anon;
SELECT is(
  public.submit_patient_lead(
    '00000000-0000-0000-0000-000000000103'::uuid,
    '00000000-0000-0000-0000-000000000104'::uuid,
    'Lead Test Patient',
    '9876543210',
    'morning',
    NULL
  ),
  '{"success": true}'::jsonb,
  'second request for the same phone and doctor is allowed within the daily quota'
);
SELECT is(
  public.submit_patient_lead(
    '00000000-0000-0000-0000-000000000103'::uuid,
    '00000000-0000-0000-0000-000000000104'::uuid,
    'Lead Test Patient',
    '9876543210',
    'evening',
    NULL
  ),
  '{"success": true}'::jsonb,
  'third request for the same phone and doctor is allowed within the daily quota'
);
SELECT is(
  public.submit_patient_lead(
    '00000000-0000-0000-0000-000000000103'::uuid,
    '00000000-0000-0000-0000-000000000104'::uuid,
    'Lead Test Patient',
    '9876543210',
    'any',
    NULL
  ),
  '{"error": "rate_limited"}'::jsonb,
  'fourth request for the same phone and doctor is rate limited'
);
SELECT is(
  public.submit_patient_lead(
    '00000000-0000-0000-0000-000000000103'::uuid,
    '00000000-0000-0000-0000-000000000106'::uuid,
    'Lead Test Patient',
    '9876543212',
    'any',
    NULL
  ),
  '{"error": "invalid_chamber"}'::jsonb,
  'a chamber belonging to another doctor cannot be selected'
);
SELECT is(
  public.submit_patient_lead(
    '00000000-0000-0000-0000-000000000107'::uuid,
    NULL,
    'Lead Test Patient',
    '9876543213',
    'any',
    NULL
  ),
  '{"error": "doctor_unavailable"}'::jsonb,
  'unverified doctors cannot receive appointment leads'
);
SELECT is(
  public.submit_patient_lead(
    '00000000-0000-0000-0000-000000000103'::uuid,
    NULL,
    'Lead Test Patient',
    '9876543214',
    'night',
    NULL
  ),
  '{"error": "invalid_preferred_time"}'::jsonb,
  'database rejects values outside the preferred-time allowlist'
);
SELECT is(
  public.submit_patient_lead(
    '00000000-0000-0000-0000-000000000103'::uuid,
    NULL,
    'Lead Test Patient',
    '1234567890',
    'any',
    NULL
  ),
  '{"error": "invalid_phone"}'::jsonb,
  'database rejects malformed patient phone numbers'
);
SELECT is(
  public.submit_patient_lead(
    '00000000-0000-0000-0000-000000000103'::uuid,
    NULL,
    'Lead Test Patient',
    '9876543215',
    'any',
    pg_catalog.repeat('x', 201)
  ),
  '{"error": "invalid_message"}'::jsonb,
  'database rejects messages longer than 200 characters'
);
RESET ROLE;

-- Public review reads and writes are restricted to safe contracts.
SELECT ok(
  NOT has_table_privilege('anon', 'public.reviews', 'INSERT'),
  'anonymous callers cannot insert reviews directly'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.reviews', 'INSERT'),
  'authenticated callers cannot insert reviews directly'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.reviews', 'UPDATE'),
  'anonymous callers cannot update reviews directly'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.reviews', 'UPDATE'),
  'authenticated callers cannot update reviews directly'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.reviews', 'DELETE'),
  'anonymous callers cannot delete reviews directly'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.reviews', 'DELETE'),
  'authenticated callers cannot delete reviews directly'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.reviews', 'SELECT'),
  'anonymous role has no table-wide SELECT privilege on reviews'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.reviews', 'SELECT'),
  'authenticated role has no table-wide SELECT privilege on reviews'
);

SELECT ok(
  has_column_privilege('anon', 'public.reviews', 'reviewer_name', 'SELECT'),
  'anonymous users can read the public reviewer display name'
);

SELECT ok(
  has_column_privilege('anon', 'public.reviews', 'status', 'SELECT'),
  'anonymous users can filter approved reviews by moderation status'
);

SELECT ok(
  has_column_privilege('authenticated', 'public.reviews', 'status', 'SELECT'),
  'authenticated users can filter public and own reviews by moderation status'
);

SELECT ok(
  NOT has_column_privilege('anon', 'public.reviews', 'reviewer_phone', 'SELECT'),
  'anonymous users cannot read private reviewer phone numbers'
);

SELECT ok(
  NOT has_column_privilege('authenticated', 'public.reviews', 'reviewer_phone', 'SELECT'),
  'authenticated users cannot read private reviewer phone numbers'
);

SELECT ok(
  NOT has_column_privilege('anon', 'public.reviews', 'user_id', 'SELECT'),
  'anonymous users cannot read reviewer account identifiers'
);

SELECT ok(
  NOT has_column_privilege('authenticated', 'public.reviews', 'user_id', 'SELECT'),
  'authenticated users cannot read other reviewers account identifiers'
);

SELECT ok(
  NOT has_column_privilege('anon', 'public.reviews', 'moderated_by', 'SELECT'),
  'anonymous users cannot read moderation actor identifiers'
);

SELECT ok(
  NOT has_column_privilege('authenticated', 'public.reviews', 'moderated_at', 'SELECT'),
  'authenticated users cannot read internal moderation timestamps'
);

SELECT ok(
  has_table_privilege('service_role', 'public.reviews', 'INSERT'),
  'service_role retains review INSERT for admin and trusted server workflows'
);

SELECT ok(
  has_function_privilege(
    'anon',
    'public.submit_review(public.entity_type,uuid,text,integer,text)'::regprocedure,
    'EXECUTE'
  ),
  'anonymous users can submit reviews through the guarded RPC'
);

SELECT ok(
  has_function_privilege(
    'authenticated',
    'public.submit_review(public.entity_type,uuid,text,integer,text)'::regprocedure,
    'EXECUTE'
  ),
  'authenticated users can submit reviews through the guarded RPC'
);

SELECT ok(
  has_function_privilege(
    'anon',
    'private.submit_review_impl(public.entity_type,uuid,text,integer,text)'::regprocedure,
    'EXECUTE'
  ),
  'anonymous wrapper callers can execute the one granted private review implementation'
);

SELECT ok(
  has_function_privilege(
    'authenticated',
    'private.submit_review_impl(public.entity_type,uuid,text,integer,text)'::regprocedure,
    'EXECUTE'
  ),
  'authenticated wrapper callers can execute the one granted private review implementation'
);

SELECT ok(
  NOT (
    SELECT prosecdef FROM pg_proc
    WHERE oid = 'public.submit_review(public.entity_type,uuid,text,integer,text)'::regprocedure
  ),
  'public review submission wrapper is SECURITY INVOKER'
);

SELECT ok(
  (
    SELECT prosecdef FROM pg_proc
    WHERE oid = 'private.submit_review_impl(public.entity_type,uuid,text,integer,text)'::regprocedure
  ),
  'private review submission implementation is SECURITY DEFINER'
);

SELECT ok(
  has_function_privilege('authenticated', 'public.get_my_reviews()'::regprocedure, 'EXECUTE'),
  'authenticated users can call their own-review history RPC'
);

SELECT ok(
  NOT has_function_privilege('anon', 'public.get_my_reviews()'::regprocedure, 'EXECUTE'),
  'anonymous users cannot call the own-review history RPC'
);

SELECT ok(
  has_function_privilege('authenticated', 'private.list_my_reviews_impl()'::regprocedure, 'EXECUTE'),
  'authenticated wrapper callers can execute the private own-review lookup'
);

SELECT ok(
  NOT has_function_privilege('anon', 'private.list_my_reviews_impl()'::regprocedure, 'EXECUTE'),
  'anonymous users cannot execute the private own-review lookup'
);

SELECT ok(
  NOT (
    SELECT prosecdef FROM pg_proc
    WHERE oid = 'public.get_my_reviews()'::regprocedure
  ),
  'public own-review wrapper is SECURITY INVOKER'
);

SELECT ok(
  (
    SELECT prosecdef FROM pg_proc
    WHERE oid = 'private.list_my_reviews_impl()'::regprocedure
  ),
  'private own-review lookup is SECURITY DEFINER'
);

-- A verified hospital fixture exercises the polymorphic entity branch.
INSERT INTO public.hospitals (
  id,
  slug,
  name_translations,
  type,
  location_id,
  address_line,
  phone,
  verification_status
)
VALUES (
  '00000000-0000-0000-0000-000000000109',
  'pgtap-review-hospital',
  '{"en":"Review test hospital"}'::jsonb,
  'hospital'::public.hospital_type,
  '00000000-0000-0000-0000-000000000102'::uuid,
  '3 Review Test Road',
  '9876543216',
  'verified'::public.verification_status
);

SET LOCAL ROLE anon;
SELECT is(
  public.submit_review(
    'doctor'::public.entity_type,
    '00000000-0000-0000-0000-000000000103'::uuid,
    '  Review Test Guest  ',
    5,
    '  This is a useful review of the service.  '
  ),
  '{"success": true}'::jsonb,
  'anonymous caller can submit a valid doctor review through the RPC'
);
RESET ROLE;

SELECT ok(
  (
    SELECT reviewer_phone IS NULL
       AND user_id IS NULL
       AND admin_reply IS NULL
       AND moderated_by IS NULL
       AND moderated_at IS NULL
       AND status = 'pending'::public.moderation_status
    FROM public.reviews
    WHERE entity_type = 'doctor'::public.entity_type
      AND entity_id = '00000000-0000-0000-0000-000000000103'::uuid
    LIMIT 1
  ),
  'guest review fields are database-controlled and start pending'
);

SELECT is(
  (
    SELECT reviewer_name
    FROM public.reviews
    WHERE entity_type = 'doctor'::public.entity_type
      AND entity_id = '00000000-0000-0000-0000-000000000103'::uuid
    LIMIT 1
  ),
  'Review Test Guest',
  'database trims reviewer display names'
);

SELECT is(
  (
    SELECT review_text
    FROM public.reviews
    WHERE entity_type = 'doctor'::public.entity_type
      AND entity_id = '00000000-0000-0000-0000-000000000103'::uuid
    LIMIT 1
  ),
  'This is a useful review of the service.',
  'database trims review text before storing it'
);

SET LOCAL ROLE anon;
SELECT is(
  public.submit_review(
    'doctor'::public.entity_type,
    '00000000-0000-0000-0000-000000000103'::uuid,
    'Review Test Guest',
    4,
    'A second useful review of this service.'
  ),
  '{"success": true}'::jsonb,
  'second review by the same guest name for one entity is allowed'
);
SELECT is(
  public.submit_review(
    'doctor'::public.entity_type,
    '00000000-0000-0000-0000-000000000103'::uuid,
    'Review Test Guest',
    3,
    'A third useful review of this service.'
  ),
  '{"success": true}'::jsonb,
  'third review by the same guest name for one entity is allowed'
);
SELECT is(
  public.submit_review(
    'doctor'::public.entity_type,
    '00000000-0000-0000-0000-000000000103'::uuid,
    'Review Test Guest',
    2,
    'A fourth useful review of this service.'
  ),
  '{"error": "rate_limited"}'::jsonb,
  'fourth review by the same guest name for one entity is rate limited'
);
SELECT is(
  public.submit_review(
    'hospital'::public.entity_type,
    '00000000-0000-0000-0000-000000000109'::uuid,
    'Hospital Review Guest',
    5,
    'A helpful review of this hospital service.'
  ),
  '{"success": true}'::jsonb,
  'anonymous caller can submit a valid hospital review through the RPC'
);
SELECT is(
  public.submit_review(
    'doctor'::public.entity_type,
    '00000000-0000-0000-0000-000000000199'::uuid,
    'Review Test Guest',
    5,
    'This is a useful review of the service.'
  ),
  '{"error": "entity_unavailable"}'::jsonb,
  'reviews cannot be submitted for a missing entity'
);
SELECT is(
  public.submit_review(
    'doctor'::public.entity_type,
    '00000000-0000-0000-0000-000000000107'::uuid,
    'Review Test Guest',
    5,
    'This is a useful review of the service.'
  ),
  '{"error": "entity_unavailable"}'::jsonb,
  'reviews cannot be submitted for an unverified doctor'
);
SELECT is(
  public.submit_review(
    'doctor'::public.entity_type,
    '00000000-0000-0000-0000-000000000103'::uuid,
    'Invalid Rating Guest',
    0,
    'This is a useful review of the service.'
  ),
  '{"error": "invalid_rating"}'::jsonb,
  'database rejects review ratings outside one to five'
);
SELECT is(
  public.submit_review(
    'doctor'::public.entity_type,
    '00000000-0000-0000-0000-000000000103'::uuid,
    'A',
    5,
    'This is a useful review of the service.'
  ),
  '{"error": "invalid_name"}'::jsonb,
  'database rejects reviewer names shorter than two characters'
);
SELECT is(
  public.submit_review(
    'doctor'::public.entity_type,
    '00000000-0000-0000-0000-000000000103'::uuid,
    'Short Review Guest',
    5,
    'Too short review'
  ),
  '{"error": "invalid_review_text"}'::jsonb,
  'database rejects review text shorter than twenty characters'
);
RESET ROLE;

-- Authenticated review submission derives its identity from auth.uid(),
-- and own-review history never accepts a caller-chosen user id.
INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  created_at,
  updated_at,
  is_sso_user,
  is_anonymous
)
VALUES (
  '00000000-0000-0000-0000-000000000151',
  'authenticated',
  'authenticated',
  'pgtap-review-owner@example.test',
  pg_catalog.now(),
  pg_catalog.now(),
  false,
  false
);

SET LOCAL ROLE authenticated;
SELECT pg_catalog.set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000151',
  true
);

SELECT is(
  public.submit_review(
    'doctor'::public.entity_type,
    '00000000-0000-0000-0000-000000000103'::uuid,
    'Account Review Owner',
    5,
    'This authenticated review belongs to the account owner.'
  ),
  '{"success": true}'::jsonb,
  'authenticated users can submit a review through the guarded RPC'
);

SELECT is(
  (
    SELECT pg_catalog.count(*)::integer
    FROM public.get_my_reviews()
  ),
  1,
  'own-review history returns the authenticated caller review'
);

SELECT is(
  (
    SELECT review_text
    FROM public.get_my_reviews()
    LIMIT 1
  ),
  'This authenticated review belongs to the account owner.',
  'own-review history returns the caller own review content without reviewer identity fields'
);

SELECT pg_catalog.set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000152',
  true
);

SELECT is(
  (
    SELECT pg_catalog.count(*)::integer
    FROM public.get_my_reviews()
  ),
  0,
  'own-review history never returns another account review'
);
RESET ROLE;

-- Secure community questions: only the public RPC writes, and author
-- phone/account/lifecycle metadata is not readable through PostgREST.
SELECT ok(
  NOT has_table_privilege('anon', 'public.questions', 'INSERT'),
  'anonymous callers cannot insert questions directly'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.questions', 'INSERT'),
  'authenticated callers cannot insert questions directly'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.questions', 'UPDATE'),
  'anonymous callers cannot update questions directly'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.questions', 'UPDATE'),
  'authenticated callers cannot update questions directly'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.questions', 'DELETE'),
  'anonymous callers cannot delete questions directly'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.questions', 'DELETE'),
  'authenticated callers cannot delete questions directly'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.questions', 'SELECT'),
  'anonymous role has no table-wide SELECT on questions'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.questions', 'SELECT'),
  'authenticated role has no table-wide SELECT on questions'
);
SELECT ok(
  has_column_privilege('anon', 'public.questions', 'title', 'SELECT'),
  'anonymous users can read public question titles'
);
SELECT ok(
  has_column_privilege('authenticated', 'public.questions', 'author_name', 'SELECT'),
  'authenticated users can read the public author display name'
);
SELECT ok(
  has_column_privilege('anon', 'public.questions', 'status', 'SELECT'),
  'anonymous users can filter approved questions by moderation status'
);
SELECT ok(
  NOT has_column_privilege('anon', 'public.questions', 'author_phone', 'SELECT'),
  'anonymous users cannot read private question author phone numbers'
);
SELECT ok(
  NOT has_column_privilege('authenticated', 'public.questions', 'author_phone', 'SELECT'),
  'authenticated users cannot read private question author phone numbers'
);
SELECT ok(
  NOT has_column_privilege('anon', 'public.questions', 'user_id', 'SELECT'),
  'anonymous users cannot read question account identifiers'
);
SELECT ok(
  NOT has_column_privilege('authenticated', 'public.questions', 'user_id', 'SELECT'),
  'authenticated users cannot read question account identifiers'
);
SELECT ok(
  NOT has_column_privilege('anon', 'public.questions', 'deleted_at', 'SELECT'),
  'anonymous users cannot read question soft-delete metadata'
);
SELECT ok(
  has_table_privilege('service_role', 'public.questions', 'INSERT'),
  'service_role retains question INSERT for admin workflows'
);
SELECT ok(
  has_function_privilege('anon', 'public.submit_question(text,text,uuid,boolean,text,text)'::regprocedure, 'EXECUTE'),
  'anonymous users can submit questions through the guarded RPC'
);
SELECT ok(
  has_function_privilege('authenticated', 'public.submit_question(text,text,uuid,boolean,text,text)'::regprocedure, 'EXECUTE'),
  'authenticated users can submit questions through the guarded RPC'
);
SELECT ok(
  has_function_privilege('anon', 'private.submit_question_impl(text,text,uuid,boolean,text,text)'::regprocedure, 'EXECUTE'),
  'anonymous wrapper callers can execute the private question implementation'
);
SELECT ok(
  NOT (SELECT prosecdef FROM pg_proc WHERE oid = 'public.submit_question(text,text,uuid,boolean,text,text)'::regprocedure),
  'public question wrapper is SECURITY INVOKER'
);
SELECT ok(
  (SELECT prosecdef FROM pg_proc WHERE oid = 'private.submit_question_impl(text,text,uuid,boolean,text,text)'::regprocedure),
  'private question implementation is SECURITY DEFINER'
);
SELECT ok(
  has_function_privilege('authenticated', 'public.get_my_questions()'::regprocedure, 'EXECUTE'),
  'authenticated users can call their own-question history RPC'
);
SELECT ok(
  NOT has_function_privilege('anon', 'public.get_my_questions()'::regprocedure, 'EXECUTE'),
  'anonymous users cannot call own-question history RPC'
);

-- Answers likewise expose only public display fields and accept writes via RPC.
SELECT ok(
  NOT has_table_privilege('anon', 'public.answers', 'INSERT'),
  'anonymous callers cannot insert answers directly'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.answers', 'INSERT'),
  'authenticated callers cannot insert answers directly'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.answers', 'UPDATE'),
  'anonymous callers cannot update answers directly'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.answers', 'DELETE'),
  'authenticated callers cannot delete answers directly'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.answers', 'SELECT'),
  'anonymous role has no table-wide SELECT on answers'
);
SELECT ok(
  has_column_privilege('anon', 'public.answers', 'body', 'SELECT'),
  'anonymous users can read approved answer content'
);
SELECT ok(
  has_column_privilege('authenticated', 'public.answers', 'doctor_id', 'SELECT'),
  'authenticated users can read the verified-doctor answer marker'
);
SELECT ok(
  NOT has_column_privilege('anon', 'public.answers', 'user_id', 'SELECT'),
  'anonymous users cannot read answer account identifiers'
);
SELECT ok(
  NOT has_column_privilege('authenticated', 'public.answers', 'user_id', 'SELECT'),
  'authenticated users cannot read answer account identifiers'
);
SELECT ok(
  has_table_privilege('service_role', 'public.answers', 'INSERT'),
  'service_role retains answer INSERT for trusted admin workflows'
);
SELECT ok(
  has_function_privilege('anon', 'public.submit_answer(uuid,text,text)'::regprocedure, 'EXECUTE'),
  'anonymous users can submit answers through the guarded RPC'
);
SELECT ok(
  has_function_privilege('authenticated', 'public.submit_answer(uuid,text,text)'::regprocedure, 'EXECUTE'),
  'authenticated users can submit answers through the guarded RPC'
);
SELECT ok(
  has_function_privilege('anon', 'private.submit_answer_impl(uuid,text,text)'::regprocedure, 'EXECUTE'),
  'anonymous wrapper callers can execute the private answer implementation'
);
SELECT ok(
  NOT (SELECT prosecdef FROM pg_proc WHERE oid = 'public.submit_answer(uuid,text,text)'::regprocedure),
  'public answer wrapper is SECURITY INVOKER'
);
SELECT ok(
  (SELECT prosecdef FROM pg_proc WHERE oid = 'private.submit_answer_impl(uuid,text,text)'::regprocedure),
  'private answer implementation is SECURITY DEFINER'
);

UPDATE public.app_settings
SET features = pg_catalog.jsonb_set(features, '{community_qa}', 'true'::jsonb, true)
WHERE id = 1;

-- Category 101 was created by the lead test fixture and is active. Question
-- 091 was created as an approved question by the upvote test fixture.
INSERT INTO public.questions (id, title, status, category_id)
VALUES (
  '00000000-0000-0000-0000-000000000171',
  'Pending question must not accept public answers',
  'pending'::public.moderation_status,
  '00000000-0000-0000-0000-000000000101'::uuid
);

INSERT INTO public.categories (id, slug, name_translations, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000175',
  'pgtap-inactive-qa-category',
  '{"en":"Inactive QA category"}'::jsonb,
  false
);

SET LOCAL ROLE anon;
SELECT is(
  public.submit_question(
    'A test question with valid length',
    'Optional question details',
    '00000000-0000-0000-0000-000000000101'::uuid,
    true,
    NULL,
    NULL
  ),
  '{"success": true}'::jsonb,
  'anonymous caller can submit a valid question through the guarded RPC'
);
RESET ROLE;

SELECT is(
  (
    SELECT status::text
    FROM public.questions
    WHERE title = 'A test question with valid length'
    LIMIT 1
  ),
  'pending',
  'database forces new public questions to pending'
);
SELECT ok(
  (
    SELECT user_id IS NULL AND author_phone IS NULL AND is_anonymous = true
    FROM public.questions
    WHERE title = 'A test question with valid length'
    LIMIT 1
  ),
  'guest question identity and private phone fields are database-controlled'
);
SELECT is(
  (
    SELECT author_name
    FROM public.questions
    WHERE title = 'A test question with valid length'
    LIMIT 1
  ),
  NULL::text,
  'anonymous question submission stores no public author name'
);

SET LOCAL ROLE anon;
SELECT is(
  public.submit_question(
    'Short',
    NULL,
    '00000000-0000-0000-0000-000000000101'::uuid,
    true,
    NULL,
    NULL
  ),
  '{"error": "invalid_title"}'::jsonb,
  'database rejects question titles shorter than ten characters'
);
SELECT is(
  public.submit_question(
    'A valid title but inactive category',
    NULL,
    '00000000-0000-0000-0000-000000000175'::uuid,
    true,
    NULL,
    NULL
  ),
  '{"error": "invalid_category"}'::jsonb,
  'database rejects inactive Q&A categories'
);
SELECT is(
  public.submit_question(
    'A valid title but no required author',
    NULL,
    '00000000-0000-0000-0000-000000000101'::uuid,
    false,
    NULL,
    NULL
  ),
  '{"error": "author_name_required"}'::jsonb,
  'non-anonymous guest questions require an author display name'
);
SELECT is(
  public.submit_question(
    'A valid title with a malformed private phone',
    NULL,
    '00000000-0000-0000-0000-000000000101'::uuid,
    true,
    NULL,
    'bad-phone'
  ),
  '{"error": "invalid_author_phone"}'::jsonb,
  'database validates optional private question author phone'
);

-- Same guest display-name bucket: five/day allowed, sixth denied.
SELECT is(
  public.submit_question(
    'Rate test question number two',
    NULL,
    '00000000-0000-0000-0000-000000000101'::uuid,
    false,
    'QA Rate Guest',
    NULL
  ),
  '{"success": true}'::jsonb,
  'first question for a guest actor is accepted'
);
SELECT is(
  public.submit_question(
    'Rate test question number three',
    NULL,
    '00000000-0000-0000-0000-000000000101'::uuid,
    false,
    'QA Rate Guest',
    NULL
  ),
  '{"success": true}'::jsonb,
  'second question for a guest actor is accepted'
);
SELECT is(
  public.submit_question(
    'Rate test question number four',
    NULL,
    '00000000-0000-0000-0000-000000000101'::uuid,
    false,
    'QA Rate Guest',
    NULL
  ),
  '{"success": true}'::jsonb,
  'third question for a guest actor is accepted'
);
SELECT is(
  public.submit_question(
    'Rate test question number five',
    NULL,
    '00000000-0000-0000-0000-000000000101'::uuid,
    false,
    'QA Rate Guest',
    NULL
  ),
  '{"success": true}'::jsonb,
  'fourth question for a guest actor is accepted'
);
SELECT is(
  public.submit_question(
    'Rate test question number six',
    NULL,
    '00000000-0000-0000-0000-000000000101'::uuid,
    false,
    'QA Rate Guest',
    NULL
  ),
  '{"success": true}'::jsonb,
  'fifth question for a guest actor is accepted'
);
SELECT is(
  public.submit_question(
    'Rate test question number seven',
    NULL,
    '00000000-0000-0000-0000-000000000101'::uuid,
    false,
    'QA Rate Guest',
    NULL
  ),
  '{"error": "rate_limited"}'::jsonb,
  'sixth question for one guest actor is rate limited'
);
RESET ROLE;

SET LOCAL ROLE anon;
SELECT is(
  public.submit_answer(
    '00000000-0000-0000-0000-000000000091'::uuid,
    '  This is a useful community answer.  ',
    'Guest Answerer'
  ),
  '{"success": true}'::jsonb,
  'anonymous caller can answer an approved question through the guarded RPC'
);
RESET ROLE;

SELECT ok(
  (
    SELECT doctor_id IS NULL
       AND user_id IS NULL
       AND status = 'pending'::public.moderation_status
    FROM public.answers
    WHERE question_id = '00000000-0000-0000-0000-000000000091'::uuid
    LIMIT 1
  ),
  'guest answer is pending and cannot claim verified-doctor or account identity'
);
SELECT is(
  (
    SELECT body
    FROM public.answers
    WHERE question_id = '00000000-0000-0000-0000-000000000091'::uuid
    LIMIT 1
  ),
  'This is a useful community answer.',
  'database trims the answer body'
);

SET LOCAL ROLE anon;
SELECT is(
  public.submit_answer(
    '00000000-0000-0000-0000-000000000171'::uuid,
    'This answer targets a pending question.',
    'Guest Answerer'
  ),
  '{"error": "question_unavailable"}'::jsonb,
  'answers cannot target pending or hidden questions'
);
SELECT is(
  public.submit_answer(
    '00000000-0000-0000-0000-000000000091'::uuid,
    'bad',
    'Guest Answerer'
  ),
  '{"error": "invalid_body"}'::jsonb,
  'database rejects answer bodies shorter than five characters'
);
RESET ROLE;

-- Authenticated question and answer submission derive user_id from auth.uid().
SET LOCAL ROLE authenticated;
SELECT pg_catalog.set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000151',
  true
);
SELECT is(
  public.submit_question(
    'Authenticated account question',
    'Question submitted from an account.',
    '00000000-0000-0000-0000-000000000101'::uuid,
    false,
    'Account QA Owner',
    NULL
  ),
  '{"success": true}'::jsonb,
  'authenticated users can submit a question through the guarded RPC'
);
SELECT is(
  (
    SELECT pg_catalog.count(*)::integer
    FROM public.get_my_questions()
  ),
  1,
  'own-question RPC returns the authenticated caller question'
);
SELECT is(
  public.submit_answer(
    '00000000-0000-0000-0000-000000000091'::uuid,
    'This answer was submitted by an authenticated account.',
    'Account QA Owner'
  ),
  '{"success": true}'::jsonb,
  'authenticated users can submit an answer through the guarded RPC'
);
SELECT pg_catalog.set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000152',
  true
);
SELECT is(
  (
    SELECT pg_catalog.count(*)::integer
    FROM public.get_my_questions()
  ),
  0,
  'own-question RPC never returns another account question'
);
RESET ROLE;

UPDATE public.app_settings
SET features = pg_catalog.jsonb_set(features, '{community_qa}', 'false'::jsonb, true)
WHERE id = 1;

SET LOCAL ROLE anon;
SELECT is(
  public.submit_question(
    'Question when Q&A feature is disabled',
    NULL,
    '00000000-0000-0000-0000-000000000101'::uuid,
    true,
    NULL,
    NULL
  ),
  '{"error": "feature_disabled"}'::jsonb,
  'database rejects question submission when Q&A feature is disabled'
);
SELECT is(
  public.submit_answer(
    '00000000-0000-0000-0000-000000000091'::uuid,
    'Answer when Q&A feature is disabled.',
    'Guest Answerer'
  ),
  '{"error": "feature_disabled"}'::jsonb,
  'database rejects answer submission when Q&A feature is disabled'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
