-- ============================================================================
-- COMPREHENSIVE RLS FIX - FIXES ALL KNOWN ISSUES AT ONCE
-- ============================================================================
-- This migration takes a systematic approach to fix RLS for all tables:
-- 1. All authenticated users can SELECT within their tenant
-- 2. All authenticated users can INSERT with auto-filled tenant_id
-- 3. Permission checks only where business logic requires it
-- 4. Anon users have proper access for client portal
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE UNIVERSAL HELPER FUNCTIONS
-- ============================================================================

-- Auto-fill tenant_id from team_members (for authenticated users)
CREATE OR REPLACE FUNCTION public.auto_set_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT tenant_id INTO NEW.tenant_id
    FROM public.team_members
    WHERE id = auth.uid()
    AND tenant_id IS NOT NULL
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

-- Auto-fill tenant_id from clients table (for client-related tables)
CREATE OR REPLACE FUNCTION public.auto_set_tenant_id_from_client()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.tenant_id IS NULL AND NEW.client_id IS NOT NULL THEN
    SELECT tenant_id INTO NEW.tenant_id
    FROM public.clients
    WHERE id = NEW.client_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_set_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_set_tenant_id() TO service_role;
GRANT EXECUTE ON FUNCTION public.auto_set_tenant_id_from_client() TO anon;
GRANT EXECUTE ON FUNCTION public.auto_set_tenant_id_from_client() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_set_tenant_id_from_client() TO service_role;


-- ============================================================================
-- STEP 2: HELPER FUNCTION TO RESET AND RECREATE POLICIES
-- ============================================================================

CREATE OR REPLACE FUNCTION setup_standard_rls(
  p_table_name TEXT,
  p_allow_anon_select BOOLEAN DEFAULT FALSE,
  p_allow_anon_write BOOLEAN DEFAULT FALSE,
  p_insert_permission TEXT DEFAULT NULL,
  p_update_permission TEXT DEFAULT NULL,
  p_delete_permission TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  policy_name TEXT;
  has_tenant_id BOOLEAN;
BEGIN
  -- Check if table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = p_table_name AND table_schema = 'public') THEN
    RAISE NOTICE 'Table % does not exist, skipping', p_table_name;
    RETURN;
  END IF;

  -- Check if tenant_id column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = p_table_name AND column_name = 'tenant_id' AND table_schema = 'public'
  ) INTO has_tenant_id;

  -- Drop all existing policies
  FOR policy_name IN 
    SELECT policyname FROM pg_policies WHERE tablename = p_table_name AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, p_table_name);
  END LOOP;

  -- Enable RLS
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', p_table_name);

  IF has_tenant_id THEN
    -- AUTHENTICATED SELECT: Always allowed within tenant
    EXECUTE format('
      CREATE POLICY "%s_auth_select" ON public.%I FOR SELECT TO authenticated
      USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id() OR public.is_platform_admin())
    ', p_table_name, p_table_name);

    -- AUTHENTICATED INSERT
    IF p_insert_permission IS NOT NULL THEN
      EXECUTE format('
        CREATE POLICY "%s_auth_insert" ON public.%I FOR INSERT TO authenticated
        WITH CHECK ((tenant_id IS NULL OR tenant_id = public.get_user_tenant_id()) AND public.has_permission(%L))
      ', p_table_name, p_table_name, p_insert_permission);
    ELSE
      EXECUTE format('
        CREATE POLICY "%s_auth_insert" ON public.%I FOR INSERT TO authenticated
        WITH CHECK (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
      ', p_table_name, p_table_name);
    END IF;

    -- AUTHENTICATED UPDATE
    IF p_update_permission IS NOT NULL THEN
      EXECUTE format('
        CREATE POLICY "%s_auth_update" ON public.%I FOR UPDATE TO authenticated
        USING ((tenant_id IS NULL OR tenant_id = public.get_user_tenant_id()) AND public.has_permission(%L))
      ', p_table_name, p_table_name, p_update_permission);
    ELSE
      EXECUTE format('
        CREATE POLICY "%s_auth_update" ON public.%I FOR UPDATE TO authenticated
        USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
      ', p_table_name, p_table_name);
    END IF;

    -- AUTHENTICATED DELETE
    IF p_delete_permission IS NOT NULL THEN
      EXECUTE format('
        CREATE POLICY "%s_auth_delete" ON public.%I FOR DELETE TO authenticated
        USING ((tenant_id IS NULL OR tenant_id = public.get_user_tenant_id()) AND public.has_permission(%L))
      ', p_table_name, p_table_name, p_delete_permission);
    ELSE
      EXECUTE format('
        CREATE POLICY "%s_auth_delete" ON public.%I FOR DELETE TO authenticated
        USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
      ', p_table_name, p_table_name);
    END IF;

    -- ANON SELECT (if allowed)
    IF p_allow_anon_select THEN
      EXECUTE format('
        CREATE POLICY "%s_anon_select" ON public.%I FOR SELECT TO anon USING (true)
      ', p_table_name, p_table_name);
    END IF;

    -- ANON WRITE (if allowed)
    IF p_allow_anon_write THEN
      EXECUTE format('
        CREATE POLICY "%s_anon_insert" ON public.%I FOR INSERT TO anon WITH CHECK (true)
      ', p_table_name, p_table_name);
      EXECUTE format('
        CREATE POLICY "%s_anon_update" ON public.%I FOR UPDATE TO anon USING (true) WITH CHECK (true)
      ', p_table_name, p_table_name);
    END IF;

  ELSE
    -- No tenant_id column - simpler policies
    EXECUTE format('
      CREATE POLICY "%s_auth_all" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)
    ', p_table_name, p_table_name);
    
    IF p_allow_anon_select THEN
      EXECUTE format('
        CREATE POLICY "%s_anon_select" ON public.%I FOR SELECT TO anon USING (true)
      ', p_table_name, p_table_name);
    END IF;
  END IF;

  -- SERVICE ROLE: Always full access
  EXECUTE format('
    CREATE POLICY "%s_service" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)
  ', p_table_name, p_table_name);

  RAISE NOTICE 'Setup RLS for table: %', p_table_name;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- STEP 3: HELPER FUNCTION TO ADD AUTO-FILL TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION add_tenant_id_trigger(
  p_table_name TEXT,
  p_use_client_lookup BOOLEAN DEFAULT FALSE
)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = p_table_name AND table_schema = 'public') THEN
    RETURN;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = p_table_name AND column_name = 'tenant_id' AND table_schema = 'public') THEN
    RETURN;
  END IF;

  EXECUTE format('DROP TRIGGER IF EXISTS auto_tenant_id_%s ON public.%I', p_table_name, p_table_name);
  
  IF p_use_client_lookup THEN
    EXECUTE format('
      CREATE TRIGGER auto_tenant_id_%s BEFORE INSERT ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id_from_client()
    ', p_table_name, p_table_name);
  ELSE
    EXECUTE format('
      CREATE TRIGGER auto_tenant_id_%s BEFORE INSERT ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id()
    ', p_table_name, p_table_name);
  END IF;
  
  RAISE NOTICE 'Added tenant_id trigger to: %', p_table_name;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- STEP 4: APPLY TO ALL TABLES
-- ============================================================================

-- Team & Core Tables (authenticated only, basic tenant isolation)
SELECT setup_standard_rls('team_members', FALSE, FALSE, NULL, 'team.edit_members', NULL);
SELECT setup_standard_rls('attendance_records', FALSE, FALSE, 'team.record_attendance', 'team.record_attendance', 'team.record_attendance');
SELECT setup_standard_rls('payroll_settings', FALSE, FALSE, 'team.payroll', 'team.payroll', 'team.payroll');
SELECT setup_standard_rls('payroll_bonuses', FALSE, FALSE, 'team.payroll', 'team.payroll', 'team.payroll');
SELECT setup_standard_rls('chatter_assignments', FALSE, FALSE, 'team.assignments', 'team.assignments', 'team.assignments');

-- Client Tables (anon read for portal, anon write for forms)
SELECT setup_standard_rls('clients', TRUE, TRUE, 'clients.create', 'clients.edit', 'clients.delete');
SELECT setup_standard_rls('client_personal_info', TRUE, TRUE, NULL, NULL, NULL);
SELECT setup_standard_rls('client_preferences', TRUE, TRUE, NULL, NULL, NULL);
SELECT setup_standard_rls('client_questionnaire', TRUE, TRUE, NULL, NULL, NULL);
SELECT setup_standard_rls('client_pins', TRUE, TRUE, NULL, NULL, NULL);
SELECT setup_standard_rls('client_notes', TRUE, FALSE, NULL, NULL, NULL);
SELECT setup_standard_rls('client_note_replies', TRUE, FALSE, NULL, NULL, NULL);
SELECT setup_standard_rls('client_platforms', TRUE, TRUE, NULL, NULL, NULL);
SELECT setup_standard_rls('client_idiolect_analysis', TRUE, FALSE, NULL, NULL, NULL);

-- Content & Scenes (anon read for portal)
SELECT setup_standard_rls('content_scenes', TRUE, FALSE, 'content.create_scene', 'content.edit_scene', 'content.delete_scene');
SELECT setup_standard_rls('client_scene_assignments', TRUE, TRUE, NULL, NULL, NULL);
SELECT setup_standard_rls('scene_content_uploads', TRUE, TRUE, NULL, NULL, NULL);
SELECT setup_standard_rls('scene_example_media', TRUE, FALSE, NULL, NULL, NULL);
SELECT setup_standard_rls('content_uploads', TRUE, FALSE, NULL, NULL, NULL);

-- Custom Requests (anon read for portal)
SELECT setup_standard_rls('custom_requests', TRUE, TRUE, 'customs.create', NULL, 'customs.delete');
SELECT setup_standard_rls('custom_notes', TRUE, FALSE, NULL, NULL, NULL);

-- Sales (authenticated only)
SELECT setup_standard_rls('chatter_sales', FALSE, FALSE, 'sales.submit', NULL, 'sales.delete');

-- Fan Notes (anon read for portal)
SELECT setup_standard_rls('fan_notes', TRUE, FALSE, NULL, NULL, NULL);
SELECT setup_standard_rls('fan_note_replies', TRUE, FALSE, NULL, NULL, NULL);

-- Notifications (authenticated only)
SELECT setup_standard_rls('notifications', FALSE, FALSE, NULL, NULL, NULL);
SELECT setup_standard_rls('notification_recipients', FALSE, FALSE, NULL, NULL, NULL);

-- SMS (authenticated only)
SELECT setup_standard_rls('sms_conversations', FALSE, FALSE, 'comms.sms', 'comms.sms', NULL);
SELECT setup_standard_rls('sms_messages', FALSE, FALSE, 'comms.send_sms', NULL, NULL);
SELECT setup_standard_rls('sms_templates', FALSE, FALSE, NULL, NULL, NULL);

-- Agencies (authenticated with permissions)
SELECT setup_standard_rls('managed_agencies', FALSE, FALSE, 'agencies.create', 'agencies.edit', 'agencies.delete');

-- Thread Notes (authenticated only)
SELECT setup_standard_rls('thread_notes', FALSE, FALSE, NULL, NULL, NULL);

-- Leads (authenticated with permissions)
SELECT setup_standard_rls('lead_activities', FALSE, FALSE, NULL, NULL, NULL);

-- Activity Logs (authenticated only)
SELECT setup_standard_rls('activity_logs', FALSE, FALSE, NULL, NULL, NULL);


-- ============================================================================
-- STEP 5: ADD AUTO-FILL TRIGGERS
-- ============================================================================

-- Standard tables (get tenant from auth user)
SELECT add_tenant_id_trigger('attendance_records', FALSE);
SELECT add_tenant_id_trigger('payroll_settings', FALSE);
SELECT add_tenant_id_trigger('payroll_bonuses', FALSE);
SELECT add_tenant_id_trigger('chatter_assignments', FALSE);
SELECT add_tenant_id_trigger('chatter_sales', FALSE);
SELECT add_tenant_id_trigger('content_scenes', FALSE);
SELECT add_tenant_id_trigger('custom_requests', FALSE);
SELECT add_tenant_id_trigger('custom_notes', FALSE);
SELECT add_tenant_id_trigger('notifications', FALSE);
SELECT add_tenant_id_trigger('notification_recipients', FALSE);
SELECT add_tenant_id_trigger('sms_conversations', FALSE);
SELECT add_tenant_id_trigger('sms_messages', FALSE);
SELECT add_tenant_id_trigger('sms_templates', FALSE);
SELECT add_tenant_id_trigger('managed_agencies', FALSE);
SELECT add_tenant_id_trigger('thread_notes', FALSE);
SELECT add_tenant_id_trigger('lead_activities', FALSE);
SELECT add_tenant_id_trigger('activity_logs', FALSE);
SELECT add_tenant_id_trigger('fan_notes', FALSE);
SELECT add_tenant_id_trigger('fan_note_replies', FALSE);
SELECT add_tenant_id_trigger('client_notes', FALSE);
SELECT add_tenant_id_trigger('client_note_replies', FALSE);
SELECT add_tenant_id_trigger('scene_content_uploads', FALSE);
SELECT add_tenant_id_trigger('scene_example_media', FALSE);
SELECT add_tenant_id_trigger('content_uploads', FALSE);

-- Client-related tables (get tenant from client)
SELECT add_tenant_id_trigger('client_pins', TRUE);
SELECT add_tenant_id_trigger('client_personal_info', TRUE);
SELECT add_tenant_id_trigger('client_preferences', TRUE);
SELECT add_tenant_id_trigger('client_questionnaire', TRUE);
SELECT add_tenant_id_trigger('client_platforms', TRUE);
SELECT add_tenant_id_trigger('client_idiolect_analysis', TRUE);
SELECT add_tenant_id_trigger('client_scene_assignments', TRUE);


-- ============================================================================
-- STEP 6: SPECIAL CASES
-- ============================================================================

-- team_members needs special handling for self-insert during signup
DROP POLICY IF EXISTS "team_members_auth_insert" ON public.team_members;
CREATE POLICY "team_members_self_insert" ON public.team_members FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- team_members self update
DROP POLICY IF EXISTS "team_members_auth_update" ON public.team_members;
CREATE POLICY "team_members_self_update" ON public.team_members FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- team_members admin update
CREATE POLICY "team_members_admin_update" ON public.team_members FOR UPDATE
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('team.edit_members')
  );

-- Tenant Roles (for role management)
SELECT setup_standard_rls('tenant_roles', FALSE, FALSE, 'settings.manage_roles', 'settings.manage_roles', 'settings.manage_roles');
SELECT setup_standard_rls('tenant_role_permissions', FALSE, FALSE, 'settings.manage_roles', NULL, 'settings.manage_roles');

-- Platforms table (globally readable, admin writable)
DROP POLICY IF EXISTS "platforms_select_all" ON public.platforms;
DROP POLICY IF EXISTS "platforms_admin_all" ON public.platforms;
DROP POLICY IF EXISTS "service_platforms" ON public.platforms;

CREATE POLICY "platforms_read_all" ON public.platforms FOR SELECT USING (true);
CREATE POLICY "platforms_admin_write" ON public.platforms FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY "platforms_service" ON public.platforms FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Platform admins table
DROP POLICY IF EXISTS "Platform owners can view all platform admins" ON public.platform_admins;
DROP POLICY IF EXISTS "Platform owners can insert platform admins" ON public.platform_admins;
DROP POLICY IF EXISTS "Platform owners can update platform admins" ON public.platform_admins;
DROP POLICY IF EXISTS "Platform owners can delete platform admins" ON public.platform_admins;
DROP POLICY IF EXISTS "platform_admins_service" ON public.platform_admins;

CREATE POLICY "platform_admins_self_view" ON public.platform_admins FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "platform_admins_owner_manage" ON public.platform_admins FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = auth.uid()
      AND pa.role = 'platform_owner'
      AND pa.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = auth.uid()
      AND pa.role = 'platform_owner'
      AND pa.is_active = true
    )
  );

CREATE POLICY "platform_admins_service" ON public.platform_admins FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Tenant agencies (main agency table)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_agencies') THEN
    PERFORM setup_standard_rls('tenant_agencies', TRUE, FALSE, NULL, NULL, NULL);
  END IF;
END $$;


-- ============================================================================
-- STEP 7: CLEANUP HELPER FUNCTIONS (optional - comment out to keep for debugging)
-- ============================================================================

-- DROP FUNCTION IF EXISTS setup_standard_rls(TEXT, BOOLEAN, BOOLEAN, TEXT, TEXT, TEXT);
-- DROP FUNCTION IF EXISTS add_tenant_id_trigger(TEXT, BOOLEAN);


-- ============================================================================
-- STEP 8: VERIFICATION QUERY (run this separately to check results)
-- ============================================================================

/*
-- Run this query to verify RLS policies are set up correctly:

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Run this query to check which tables have RLS enabled:

SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Run this query to check triggers:

SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE 'auto_tenant%'
ORDER BY event_object_table;
*/


-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

