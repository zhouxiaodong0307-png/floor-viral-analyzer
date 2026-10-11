-- EMERGENCY ROLLBACK ONLY: RESTORES INSECURE ANONYMOUS ACCESS.
-- Use only if owner-authenticated deployment cannot read/write and a recovery is essential.
BEGIN;
CREATE POLICY floor_app_read ON public.floor_app_data FOR SELECT TO anon USING (id='main');
CREATE POLICY floor_app_insert ON public.floor_app_data FOR INSERT TO anon WITH CHECK (id='main');
CREATE POLICY floor_app_update ON public.floor_app_data FOR UPDATE TO anon USING (id='main') WITH CHECK (id='main');
CREATE POLICY floor_app_delete ON public.floor_app_data FOR DELETE TO anon USING (id='main');
-- No automatic regrant for rls_auto_enable: it is unsafe to expose.
COMMIT;
