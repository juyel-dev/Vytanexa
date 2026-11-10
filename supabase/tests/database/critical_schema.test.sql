-- Critical database contract tests for the main-project migration baseline.
-- Run only against the disposable local stack via: npm run db:test

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

BEGIN;
SELECT plan(21);

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
  NOT has_schema_privilege('anon', 'private', 'USAGE'),
  'anon cannot use the private schema'
);

SELECT ok(
  NOT has_schema_privilege('authenticated', 'private', 'USAGE'),
  'authenticated cannot use the private schema'
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
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'blood_donors'
      AND policyname = 'authenticated_insert_own_donor'
      AND cmd = 'INSERT'
  ),
  'donor insert is guarded by the authenticated own-row policy'
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

SELECT * FROM finish();
ROLLBACK;
