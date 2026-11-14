-- Critical database contract tests for the main-project migration baseline.
-- Run only against the disposable local stack via: npm run db:test

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

BEGIN;
SELECT plan(65);

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

SELECT * FROM finish();
ROLLBACK;
