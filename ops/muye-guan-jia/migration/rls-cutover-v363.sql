-- V363 SAFE CUTOVER - DO NOT RUN ON PRODUCTION BEFORE EXPLICIT OWNER APPROVAL.
-- Prerequisites: independent full export, 24-order history reconciliation, verified login and rollback.
-- This transaction closes legacy anonymous access to the existing row only.
BEGIN;
DO $guard$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.floor_app_data WHERE id='main') THEN
  RAISE EXCEPTION 'Main business data is missing: abort security cutover';
 END IF;
 IF NOT EXISTS(
  SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='floor_app_data'
    AND policyname='floor_owner_select_v356' AND cmd='SELECT'
 ) OR NOT EXISTS(
  SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='floor_app_data'
    AND policyname='floor_owner_update_v356' AND cmd='UPDATE'
 ) THEN
  RAISE EXCEPTION 'Owner authenticated RLS policies missing: abort';
 END IF;
 IF NOT EXISTS(
  SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname='floor_app_data' AND c.relrowsecurity
 ) THEN
  RAISE EXCEPTION 'RLS disabled: abort';
 END IF;
END;
$guard$;
DROP POLICY IF EXISTS floor_app_read ON public.floor_app_data;
DROP POLICY IF EXISTS floor_app_insert ON public.floor_app_data;
DROP POLICY IF EXISTS floor_app_update ON public.floor_app_data;
DROP POLICY IF EXISTS floor_app_delete ON public.floor_app_data;
-- Advisor warning: this function must not remain anonymously callable.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
COMMIT;
-- Verify afterwards: SELECT policyname,roles,cmd FROM pg_policies WHERE schemaname='public' AND tablename='floor_app_data';
