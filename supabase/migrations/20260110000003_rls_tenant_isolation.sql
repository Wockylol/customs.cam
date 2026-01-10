-- ============================================================================
-- MULTI-TENANT SAAS ARCHITECTURE - PHASE 2: RLS TENANT ISOLATION
-- ============================================================================
-- This migration creates comprehensive RLS policies for tenant isolation.
-- All policies follow the pattern: tenant_id = get_user_tenant_id()
-- Platform admins bypass tenant restrictions via is_platform_admin()
-- ============================================================================

-- ============================================================================
-- HELPER: Recreate get_user_tenant_id with better error handling
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  tid UUID;
BEGIN
  SELECT tenant_id INTO tid 
  FROM public.team_members 
  WHERE id = auth.uid() 
  AND tenant_id IS NOT NULL 
  LIMIT 1;
  
  RETURN tid;
END;
$$;

-- ============================================================================
-- 1. TEAM_MEMBERS RLS POLICIES
-- ============================================================================

-- Drop ALL existing policies on team_members
DO $$
DECLARE
  policy_name TEXT;
BEGIN
  FOR policy_name IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'team_members' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.team_members', policy_name);
  END LOOP;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Users can view all team members in their tenant
CREATE POLICY "tenant_team_members_select"
  ON public.team_members FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    OR public.is_platform_admin()
    OR id = auth.uid() -- Can always see own record
  );

-- Users can insert their own record (during signup)
CREATE POLICY "tenant_team_members_insert_self"
  ON public.team_members FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Users can update their own record
CREATE POLICY "tenant_team_members_update_self"
  ON public.team_members FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins/owners can update any team member in their tenant
CREATE POLICY "tenant_team_members_update_admin"
  ON public.team_members FOR UPDATE
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );

-- Service role bypass
CREATE POLICY "service_team_members"
  ON public.team_members FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 2. CLIENTS RLS POLICIES
-- ============================================================================

DO $$
DECLARE
  policy_name TEXT;
BEGIN
  FOR policy_name IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'clients' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.clients', policy_name);
  END LOOP;
END $$;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Team members can view clients in their tenant
CREATE POLICY "tenant_clients_select"
  ON public.clients FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    OR public.is_platform_admin()
  );

-- Admins/managers can insert clients
CREATE POLICY "tenant_clients_insert"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = auth.uid()
      AND tm.role IN ('owner', 'admin', 'manager')
    )
  );

-- Admins/managers can update clients
CREATE POLICY "tenant_clients_update"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = auth.uid()
      AND tm.role IN ('owner', 'admin', 'manager')
    )
  );

-- Admins can delete clients
CREATE POLICY "tenant_clients_delete"
  ON public.clients FOR DELETE
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );

-- Public access for client portal (by username lookup)
CREATE POLICY "public_clients_select_by_username"
  ON public.clients FOR SELECT
  TO anon
  USING (is_active = true);

-- Service role bypass
CREATE POLICY "service_clients"
  ON public.clients FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 3. MANAGED_AGENCIES RLS POLICIES
-- ============================================================================

DO $$
DECLARE
  policy_name TEXT;
BEGIN
  FOR policy_name IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'managed_agencies' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.managed_agencies', policy_name);
  END LOOP;
END $$;

ALTER TABLE public.managed_agencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_managed_agencies_select"
  ON public.managed_agencies FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    OR public.is_platform_admin()
  );

CREATE POLICY "tenant_managed_agencies_insert"
  ON public.managed_agencies FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "tenant_managed_agencies_update"
  ON public.managed_agencies FOR UPDATE
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "tenant_managed_agencies_delete"
  ON public.managed_agencies FOR DELETE
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "service_managed_agencies"
  ON public.managed_agencies FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 4. CUSTOM_REQUESTS RLS POLICIES
-- ============================================================================

DO $$
DECLARE
  policy_name TEXT;
BEGIN
  FOR policy_name IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'custom_requests' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.custom_requests', policy_name);
  END LOOP;
END $$;

ALTER TABLE public.custom_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_custom_requests_select"
  ON public.custom_requests FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    OR public.is_platform_admin()
  );

-- Public access for client portal
CREATE POLICY "public_custom_requests_select"
  ON public.custom_requests FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "tenant_custom_requests_insert"
  ON public.custom_requests FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "tenant_custom_requests_update"
  ON public.custom_requests FOR UPDATE
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "tenant_custom_requests_delete"
  ON public.custom_requests FOR DELETE
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "service_custom_requests"
  ON public.custom_requests FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 5. CONTENT_SCENES RLS POLICIES
-- ============================================================================

DO $$
DECLARE
  policy_name TEXT;
BEGIN
  FOR policy_name IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'content_scenes' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.content_scenes', policy_name);
  END LOOP;
END $$;

ALTER TABLE public.content_scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_content_scenes_select"
  ON public.content_scenes FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    OR public.is_platform_admin()
  );

CREATE POLICY "public_content_scenes_select"
  ON public.content_scenes FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "tenant_content_scenes_insert"
  ON public.content_scenes FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "tenant_content_scenes_update"
  ON public.content_scenes FOR UPDATE
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "tenant_content_scenes_delete"
  ON public.content_scenes FOR DELETE
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "service_content_scenes"
  ON public.content_scenes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 6. CLIENT_SCENE_ASSIGNMENTS RLS POLICIES
-- ============================================================================

DO $$
DECLARE
  policy_name TEXT;
BEGIN
  FOR policy_name IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'client_scene_assignments' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.client_scene_assignments', policy_name);
  END LOOP;
END $$;

ALTER TABLE public.client_scene_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_client_scene_assignments_select"
  ON public.client_scene_assignments FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    OR public.is_platform_admin()
  );

CREATE POLICY "public_client_scene_assignments_select"
  ON public.client_scene_assignments FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "tenant_client_scene_assignments_all"
  ON public.client_scene_assignments FOR ALL
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "service_client_scene_assignments"
  ON public.client_scene_assignments FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 7. CHATTER_SALES RLS POLICIES
-- ============================================================================

DO $$
DECLARE
  policy_name TEXT;
BEGIN
  FOR policy_name IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'chatter_sales' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.chatter_sales', policy_name);
  END LOOP;
END $$;

ALTER TABLE public.chatter_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_chatter_sales_select"
  ON public.chatter_sales FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    OR public.is_platform_admin()
  );

CREATE POLICY "tenant_chatter_sales_insert"
  ON public.chatter_sales FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "tenant_chatter_sales_update"
  ON public.chatter_sales FOR UPDATE
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "tenant_chatter_sales_delete"
  ON public.chatter_sales FOR DELETE
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "service_chatter_sales"
  ON public.chatter_sales FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 8. CHATTER_ASSIGNMENTS RLS POLICIES
-- ============================================================================

DO $$
DECLARE
  policy_name TEXT;
BEGIN
  FOR policy_name IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'chatter_assignments' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.chatter_assignments', policy_name);
  END LOOP;
END $$;

ALTER TABLE public.chatter_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_chatter_assignments_select"
  ON public.chatter_assignments FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    OR public.is_platform_admin()
  );

CREATE POLICY "tenant_chatter_assignments_all"
  ON public.chatter_assignments FOR ALL
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "service_chatter_assignments"
  ON public.chatter_assignments FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 9. NOTIFICATIONS RLS POLICIES
-- ============================================================================

DO $$
DECLARE
  policy_name TEXT;
BEGIN
  FOR policy_name IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'notifications' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.notifications', policy_name);
  END LOOP;
END $$;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_notifications_select"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    OR public.is_platform_admin()
  );

CREATE POLICY "tenant_notifications_insert"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "tenant_notifications_update"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "service_notifications"
  ON public.notifications FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 10. NOTIFICATION_RECIPIENTS RLS POLICIES
-- ============================================================================

DO $$
DECLARE
  policy_name TEXT;
BEGIN
  FOR policy_name IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'notification_recipients' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.notification_recipients', policy_name);
  END LOOP;
END $$;

ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_notification_recipients_select"
  ON public.notification_recipients FOR SELECT
  TO authenticated
  USING (
    team_member_id = auth.uid()
    OR tenant_id = public.get_user_tenant_id()
    OR public.is_platform_admin()
  );

CREATE POLICY "tenant_notification_recipients_all"
  ON public.notification_recipients FOR ALL
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "service_notification_recipients"
  ON public.notification_recipients FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 11. SMS_CONVERSATIONS RLS POLICIES
-- ============================================================================

DO $$
DECLARE
  policy_name TEXT;
BEGIN
  FOR policy_name IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'sms_conversations' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.sms_conversations', policy_name);
  END LOOP;
END $$;

ALTER TABLE public.sms_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_sms_conversations_select"
  ON public.sms_conversations FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    OR public.is_platform_admin()
  );

CREATE POLICY "tenant_sms_conversations_all"
  ON public.sms_conversations FOR ALL
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "service_sms_conversations"
  ON public.sms_conversations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 12. SMS_MESSAGES RLS POLICIES
-- ============================================================================

DO $$
DECLARE
  policy_name TEXT;
BEGIN
  FOR policy_name IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'sms_messages' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.sms_messages', policy_name);
  END LOOP;
END $$;

ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_sms_messages_select"
  ON public.sms_messages FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    OR public.is_platform_admin()
  );

CREATE POLICY "tenant_sms_messages_all"
  ON public.sms_messages FOR ALL
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id())
  WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "service_sms_messages"
  ON public.sms_messages FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 13-25: REMAINING TABLES (simplified pattern)
-- ============================================================================

-- Generic function to create tenant RLS policies
CREATE OR REPLACE FUNCTION create_tenant_rls_policies(table_name TEXT)
RETURNS VOID AS $$
BEGIN
  -- Drop existing policies
  EXECUTE format('
    DO $inner$
    DECLARE
      policy_name TEXT;
    BEGIN
      FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = %L AND schemaname = ''public''
      LOOP
        EXECUTE format(''DROP POLICY IF EXISTS %%I ON public.%I'', policy_name);
      END LOOP;
    END $inner$
  ', table_name, table_name);
  
  -- Enable RLS
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
  
  -- Select policy
  EXECUTE format('
    CREATE POLICY "tenant_%s_select" ON public.%I FOR SELECT TO authenticated
    USING (tenant_id = public.get_user_tenant_id() OR public.is_platform_admin())
  ', table_name, table_name);
  
  -- All operations policy
  EXECUTE format('
    CREATE POLICY "tenant_%s_all" ON public.%I FOR ALL TO authenticated
    USING (tenant_id = public.get_user_tenant_id())
    WITH CHECK (tenant_id = public.get_user_tenant_id())
  ', table_name, table_name);
  
  -- Service role policy
  EXECUTE format('
    CREATE POLICY "service_%s" ON public.%I FOR ALL TO service_role
    USING (true) WITH CHECK (true)
  ', table_name, table_name);
  
  -- Public/anon select policy (for client portal)
  EXECUTE format('
    CREATE POLICY "public_%s_select" ON public.%I FOR SELECT TO anon USING (true)
  ', table_name, table_name);
  
END;
$$ LANGUAGE plpgsql;

-- Apply to remaining tables
SELECT create_tenant_rls_policies('activity_logs');
SELECT create_tenant_rls_policies('client_preferences');
SELECT create_tenant_rls_policies('client_personal_info');
SELECT create_tenant_rls_policies('client_notes');
SELECT create_tenant_rls_policies('client_idiolect_analysis');
SELECT create_tenant_rls_policies('client_platforms');
SELECT create_tenant_rls_policies('custom_notes');
SELECT create_tenant_rls_policies('content_uploads');
SELECT create_tenant_rls_policies('scene_content_uploads');
SELECT create_tenant_rls_policies('scene_example_media');

-- Conditional tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_records') THEN
    PERFORM create_tenant_rls_policies('attendance_records');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_settings') THEN
    PERFORM create_tenant_rls_policies('payroll_settings');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_bonuses') THEN
    PERFORM create_tenant_rls_policies('payroll_bonuses');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fan_notes') THEN
    PERFORM create_tenant_rls_policies('fan_notes');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sms_templates') THEN
    PERFORM create_tenant_rls_policies('sms_templates');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_activities') THEN
    PERFORM create_tenant_rls_policies('lead_activities');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'platform_interests') THEN
    PERFORM create_tenant_rls_policies('platform_interests');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'thread_notes') THEN
    PERFORM create_tenant_rls_policies('thread_notes');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_pins') THEN
    PERFORM create_tenant_rls_policies('client_pins');
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_questionnaire') THEN
    PERFORM create_tenant_rls_policies('client_questionnaire');
  END IF;
END $$;

-- Drop the helper function (not needed at runtime)
DROP FUNCTION IF EXISTS create_tenant_rls_policies(TEXT);

-- ============================================================================
-- PLATFORMS TABLE - KEEP GLOBAL (no tenant isolation)
-- ============================================================================
-- platforms table remains globally accessible as it contains shared definitions

DO $$
DECLARE
  policy_name TEXT;
BEGIN
  FOR policy_name IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'platforms' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.platforms', policy_name);
  END LOOP;
END $$;

ALTER TABLE public.platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platforms_select_all"
  ON public.platforms FOR SELECT
  USING (true);

CREATE POLICY "platforms_admin_all"
  ON public.platforms FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "service_platforms"
  ON public.platforms FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

