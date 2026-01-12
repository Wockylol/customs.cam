-- ============================================================================
-- DYNAMIC ROLES & PERMISSIONS SYSTEM - PHASE 5: RLS PERMISSION FUNCTIONS
-- ============================================================================
-- This migration creates permission-checking functions and updates RLS policies
-- to use permissions instead of hardcoded role checks.
-- ============================================================================

-- ============================================================================
-- CORE PERMISSION CHECK FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.has_permission(permission_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.tenant_role_permissions trp
    JOIN public.tenant_roles tr ON tr.id = trp.role_id
    JOIN public.team_members tm ON tm.role_id = tr.id
    JOIN public.permissions_catalog pc ON pc.id = trp.permission_id
    WHERE tm.id = auth.uid()
    AND pc.code = permission_code
    AND pc.is_active = true
  )
  OR public.is_platform_admin();
$$;

-- ============================================================================
-- CHECK MULTIPLE PERMISSIONS (ANY)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.has_any_permission(permission_codes TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.tenant_role_permissions trp
    JOIN public.tenant_roles tr ON tr.id = trp.role_id
    JOIN public.team_members tm ON tm.role_id = tr.id
    JOIN public.permissions_catalog pc ON pc.id = trp.permission_id
    WHERE tm.id = auth.uid()
    AND pc.code = ANY(permission_codes)
    AND pc.is_active = true
  )
  OR public.is_platform_admin();
$$;

-- ============================================================================
-- CHECK MULTIPLE PERMISSIONS (ALL)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.has_all_permissions(permission_codes TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT (
    SELECT COUNT(DISTINCT pc.code)
    FROM public.tenant_role_permissions trp
    JOIN public.tenant_roles tr ON tr.id = trp.role_id
    JOIN public.team_members tm ON tm.role_id = tr.id
    JOIN public.permissions_catalog pc ON pc.id = trp.permission_id
    WHERE tm.id = auth.uid()
    AND pc.code = ANY(permission_codes)
    AND pc.is_active = true
  ) = array_length(permission_codes, 1)
  OR public.is_platform_admin();
$$;

-- ============================================================================
-- GET ALL USER PERMISSIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_permissions()
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    array_agg(DISTINCT pc.code),
    ARRAY[]::TEXT[]
  )
  FROM public.tenant_role_permissions trp
  JOIN public.tenant_roles tr ON tr.id = trp.role_id
  JOIN public.team_members tm ON tm.role_id = tr.id
  JOIN public.permissions_catalog pc ON pc.id = trp.permission_id
  WHERE tm.id = auth.uid()
  AND pc.is_active = true;
$$;

-- ============================================================================
-- GET USER ROLE INFO
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_role_info()
RETURNS TABLE (
  role_id UUID,
  role_name TEXT,
  role_slug TEXT,
  hierarchy_level INT,
  is_system_default BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    tr.id,
    tr.name,
    tr.slug,
    tr.hierarchy_level,
    tr.is_system_default
  FROM public.team_members tm
  JOIN public.tenant_roles tr ON tr.id = tm.role_id
  WHERE tm.id = auth.uid();
$$;

-- ============================================================================
-- UPDATE CLIENTS RLS POLICIES
-- ============================================================================

-- Drop existing insert/update/delete policies
DROP POLICY IF EXISTS "tenant_clients_insert" ON public.clients;
DROP POLICY IF EXISTS "tenant_clients_update" ON public.clients;
DROP POLICY IF EXISTS "tenant_clients_delete" ON public.clients;

-- Recreate with permission-based checks
CREATE POLICY "tenant_clients_insert"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('clients.create')
  );

CREATE POLICY "tenant_clients_update"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('clients.edit')
  );

CREATE POLICY "tenant_clients_delete"
  ON public.clients FOR DELETE
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('clients.delete')
  );

-- ============================================================================
-- UPDATE CUSTOM_REQUESTS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "tenant_custom_requests_insert" ON public.custom_requests;
DROP POLICY IF EXISTS "tenant_custom_requests_update" ON public.custom_requests;
DROP POLICY IF EXISTS "tenant_custom_requests_delete" ON public.custom_requests;

CREATE POLICY "tenant_custom_requests_insert"
  ON public.custom_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('customs.create')
  );

CREATE POLICY "tenant_custom_requests_update"
  ON public.custom_requests FOR UPDATE
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_any_permission(ARRAY['customs.approve', 'customs.complete', 'customs.deliver'])
  );

CREATE POLICY "tenant_custom_requests_delete"
  ON public.custom_requests FOR DELETE
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('customs.delete')
  );

-- ============================================================================
-- UPDATE CHATTER_SALES RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "tenant_chatter_sales_insert" ON public.chatter_sales;
DROP POLICY IF EXISTS "tenant_chatter_sales_update" ON public.chatter_sales;
DROP POLICY IF EXISTS "tenant_chatter_sales_delete" ON public.chatter_sales;

CREATE POLICY "tenant_chatter_sales_insert"
  ON public.chatter_sales FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('sales.submit')
  );

CREATE POLICY "tenant_chatter_sales_update"
  ON public.chatter_sales FOR UPDATE
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND (
      chatter_id = auth.uid() -- Own sales
      OR public.has_permission('sales.approve')
    )
  );

CREATE POLICY "tenant_chatter_sales_delete"
  ON public.chatter_sales FOR DELETE
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('sales.delete')
  );

-- ============================================================================
-- UPDATE TEAM_MEMBERS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "tenant_team_members_update_admin" ON public.team_members;

CREATE POLICY "tenant_team_members_update_admin"
  ON public.team_members FOR UPDATE
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('team.edit_members')
  );

-- ============================================================================
-- UPDATE CONTENT_SCENES RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "tenant_content_scenes_insert" ON public.content_scenes;
DROP POLICY IF EXISTS "tenant_content_scenes_update" ON public.content_scenes;
DROP POLICY IF EXISTS "tenant_content_scenes_delete" ON public.content_scenes;

CREATE POLICY "tenant_content_scenes_insert"
  ON public.content_scenes FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('content.create_scene')
  );

CREATE POLICY "tenant_content_scenes_update"
  ON public.content_scenes FOR UPDATE
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('content.edit_scene')
  );

CREATE POLICY "tenant_content_scenes_delete"
  ON public.content_scenes FOR DELETE
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('content.delete_scene')
  );

-- ============================================================================
-- UPDATE MANAGED_AGENCIES RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "tenant_managed_agencies_insert" ON public.managed_agencies;
DROP POLICY IF EXISTS "tenant_managed_agencies_update" ON public.managed_agencies;
DROP POLICY IF EXISTS "tenant_managed_agencies_delete" ON public.managed_agencies;

CREATE POLICY "tenant_managed_agencies_insert"
  ON public.managed_agencies FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('agencies.create')
  );

CREATE POLICY "tenant_managed_agencies_update"
  ON public.managed_agencies FOR UPDATE
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('agencies.edit')
  );

CREATE POLICY "tenant_managed_agencies_delete"
  ON public.managed_agencies FOR DELETE
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('agencies.delete')
  );

-- ============================================================================
-- UPDATE CHATTER_ASSIGNMENTS RLS POLICIES
-- ============================================================================

-- Drop existing all policy and create more specific ones
DROP POLICY IF EXISTS "tenant_chatter_assignments_all" ON public.chatter_assignments;

CREATE POLICY "tenant_chatter_assignments_insert"
  ON public.chatter_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('team.assignments')
  );

CREATE POLICY "tenant_chatter_assignments_update"
  ON public.chatter_assignments FOR UPDATE
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('team.assignments')
  );

CREATE POLICY "tenant_chatter_assignments_delete"
  ON public.chatter_assignments FOR DELETE
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('team.assignments')
  );

-- ============================================================================
-- UPDATE SMS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "tenant_sms_messages_all" ON public.sms_messages;

CREATE POLICY "tenant_sms_messages_insert"
  ON public.sms_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('comms.send_sms')
  );

CREATE POLICY "tenant_sms_messages_update"
  ON public.sms_messages FOR UPDATE
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('comms.sms')
  );

-- ============================================================================
-- UPDATE TENANT_ROLES RLS POLICIES (use permission-based)
-- ============================================================================

DROP POLICY IF EXISTS "tenant_roles_insert" ON public.tenant_roles;
DROP POLICY IF EXISTS "tenant_roles_update" ON public.tenant_roles;
DROP POLICY IF EXISTS "tenant_roles_delete" ON public.tenant_roles;

CREATE POLICY "tenant_roles_insert"
  ON public.tenant_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('settings.manage_roles')
  );

CREATE POLICY "tenant_roles_update"
  ON public.tenant_roles FOR UPDATE
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('settings.manage_roles')
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
  );

CREATE POLICY "tenant_roles_delete"
  ON public.tenant_roles FOR DELETE
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND is_immutable = false
    AND public.has_permission('settings.manage_roles')
  );

-- ============================================================================
-- UPDATE TENANT_ROLE_PERMISSIONS RLS POLICIES (use permission-based)
-- ============================================================================

DROP POLICY IF EXISTS "tenant_role_permissions_insert" ON public.tenant_role_permissions;
DROP POLICY IF EXISTS "tenant_role_permissions_delete" ON public.tenant_role_permissions;

CREATE POLICY "tenant_role_permissions_insert"
  ON public.tenant_role_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_roles tr
      WHERE tr.id = role_id
      AND tr.tenant_id = public.get_user_tenant_id()
    )
    AND public.has_permission('settings.manage_roles')
  );

CREATE POLICY "tenant_role_permissions_delete"
  ON public.tenant_role_permissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_roles tr
      WHERE tr.id = role_id
      AND tr.tenant_id = public.get_user_tenant_id()
    )
    AND public.has_permission('settings.manage_roles')
  );

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

