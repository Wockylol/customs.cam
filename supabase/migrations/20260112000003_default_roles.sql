-- ============================================================================
-- DYNAMIC ROLES & PERMISSIONS SYSTEM - PHASE 3: DEFAULT ROLES
-- ============================================================================
-- This migration creates default system roles for all existing tenants and
-- assigns permissions matching the current hardcoded behavior.
-- ============================================================================

-- ============================================================================
-- FUNCTION: Create default roles for a tenant
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_default_roles_for_tenant(p_tenant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_role_id UUID;
  v_admin_role_id UUID;
  v_manager_role_id UUID;
  v_chatter_role_id UUID;
  v_pending_role_id UUID;
BEGIN
  -- Create Owner role (hierarchy level 100)
  INSERT INTO public.tenant_roles (tenant_id, name, slug, description, color, hierarchy_level, is_system_default, is_immutable)
  VALUES (p_tenant_id, 'Owner', 'owner', 'Full access to all features and settings', '#7C3AED', 100, true, true)
  ON CONFLICT (tenant_id, slug) DO NOTHING
  RETURNING id INTO v_owner_role_id;
  
  IF v_owner_role_id IS NULL THEN
    SELECT id INTO v_owner_role_id FROM public.tenant_roles WHERE tenant_id = p_tenant_id AND slug = 'owner';
  END IF;

  -- Create Admin role (hierarchy level 80)
  INSERT INTO public.tenant_roles (tenant_id, name, slug, description, color, hierarchy_level, is_system_default, is_immutable)
  VALUES (p_tenant_id, 'Admin', 'admin', 'Administrative access with most permissions', '#2563EB', 80, true, false)
  ON CONFLICT (tenant_id, slug) DO NOTHING
  RETURNING id INTO v_admin_role_id;
  
  IF v_admin_role_id IS NULL THEN
    SELECT id INTO v_admin_role_id FROM public.tenant_roles WHERE tenant_id = p_tenant_id AND slug = 'admin';
  END IF;

  -- Create Manager role (hierarchy level 60)
  INSERT INTO public.tenant_roles (tenant_id, name, slug, description, color, hierarchy_level, is_system_default, is_immutable)
  VALUES (p_tenant_id, 'Manager', 'manager', 'Team management and oversight', '#059669', 60, true, false)
  ON CONFLICT (tenant_id, slug) DO NOTHING
  RETURNING id INTO v_manager_role_id;
  
  IF v_manager_role_id IS NULL THEN
    SELECT id INTO v_manager_role_id FROM public.tenant_roles WHERE tenant_id = p_tenant_id AND slug = 'manager';
  END IF;

  -- Create Chatter role (hierarchy level 40)
  INSERT INTO public.tenant_roles (tenant_id, name, slug, description, color, hierarchy_level, is_system_default, is_immutable)
  VALUES (p_tenant_id, 'Chatter', 'chatter', 'Standard team member with client access', '#F59E0B', 40, true, false)
  ON CONFLICT (tenant_id, slug) DO NOTHING
  RETURNING id INTO v_chatter_role_id;
  
  IF v_chatter_role_id IS NULL THEN
    SELECT id INTO v_chatter_role_id FROM public.tenant_roles WHERE tenant_id = p_tenant_id AND slug = 'chatter';
  END IF;

  -- Create Pending role (hierarchy level 10)
  INSERT INTO public.tenant_roles (tenant_id, name, slug, description, color, hierarchy_level, is_system_default, is_immutable)
  VALUES (p_tenant_id, 'Pending', 'pending', 'Awaiting approval', '#9CA3AF', 10, true, false)
  ON CONFLICT (tenant_id, slug) DO NOTHING
  RETURNING id INTO v_pending_role_id;
  
  IF v_pending_role_id IS NULL THEN
    SELECT id INTO v_pending_role_id FROM public.tenant_roles WHERE tenant_id = p_tenant_id AND slug = 'pending';
  END IF;

  -- ========================================================================
  -- ASSIGN PERMISSIONS TO OWNER (all permissions)
  -- ========================================================================
  INSERT INTO public.tenant_role_permissions (role_id, permission_id)
  SELECT v_owner_role_id, id FROM public.permissions_catalog WHERE is_active = true
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  -- ========================================================================
  -- ASSIGN PERMISSIONS TO ADMIN (almost all, except some settings)
  -- ========================================================================
  INSERT INTO public.tenant_role_permissions (role_id, permission_id)
  SELECT v_admin_role_id, id FROM public.permissions_catalog 
  WHERE is_active = true
  AND code NOT IN ('settings.manage_roles') -- Only owner can manage roles
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  -- ========================================================================
  -- ASSIGN PERMISSIONS TO MANAGER
  -- ========================================================================
  INSERT INTO public.tenant_role_permissions (role_id, permission_id)
  SELECT v_manager_role_id, id FROM public.permissions_catalog 
  WHERE is_active = true
  AND code IN (
    -- Dashboard
    'dashboard.view',
    -- Notifications
    'notifications.view', 'notifications.manage',
    -- Clients (view and list, not delete)
    'clients.view', 'clients.list', 'clients.create', 'clients.edit', 'clients.platform_overview',
    -- Sales (view and management, not delete)
    'sales.view', 'sales.tracker', 'sales.submit', 'sales.approve', 'sales.all', 'sales.performance',
    -- Customs (full workflow)
    'customs.view', 'customs.my_customs', 'customs.all', 'customs.pending_approval',
    'customs.pending_completion', 'customs.pending_delivery', 'customs.calls',
    'customs.create', 'customs.approve', 'customs.complete', 'customs.deliver',
    -- Team (view and manage, not edit roles)
    'team.view', 'team.attendance', 'team.assignments', 'team.user_approvals',
    'team.approve_users', 'team.record_attendance',
    -- Agencies
    'agencies.view'
  )
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  -- ========================================================================
  -- ASSIGN PERMISSIONS TO CHATTER
  -- ========================================================================
  INSERT INTO public.tenant_role_permissions (role_id, permission_id)
  SELECT v_chatter_role_id, id FROM public.permissions_catalog 
  WHERE is_active = true
  AND code IN (
    -- Dashboard
    'dashboard.view',
    -- Notifications
    'notifications.view', 'notifications.manage',
    -- Clients (view only assigned)
    'clients.view',
    -- Sales (own tracker and submit)
    'sales.tracker', 'sales.submit',
    -- Customs (own customs only)
    'customs.view', 'customs.my_customs', 'customs.create'
  )
  ON CONFLICT (role_id, permission_id) DO NOTHING;

  -- ========================================================================
  -- PENDING ROLE: No permissions (they can't access anything until approved)
  -- ========================================================================
  -- No permissions assigned to pending role

END;
$$;

-- ============================================================================
-- CREATE DEFAULT ROLES FOR ALL EXISTING TENANTS
-- ============================================================================

DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN SELECT id FROM public.tenant_agencies WHERE is_active = true
  LOOP
    PERFORM public.create_default_roles_for_tenant(tenant_record.id);
    RAISE NOTICE 'Created default roles for tenant: %', tenant_record.id;
  END LOOP;
END $$;

-- ============================================================================
-- TRIGGER: Auto-create default roles when a new tenant is created
-- ============================================================================

CREATE OR REPLACE FUNCTION public.on_tenant_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create default roles for the new tenant
  PERFORM public.create_default_roles_for_tenant(NEW.id);
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_create_tenant_roles ON public.tenant_agencies;

CREATE TRIGGER trigger_create_tenant_roles
  AFTER INSERT ON public.tenant_agencies
  FOR EACH ROW
  EXECUTE FUNCTION public.on_tenant_created();

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

