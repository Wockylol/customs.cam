-- ============================================================================
-- DYNAMIC ROLES & PERMISSIONS SYSTEM - PHASE 2: TENANT ROLES
-- ============================================================================
-- This migration creates the tenant_roles and tenant_role_permissions tables
-- for custom role management per tenant.
-- ============================================================================

-- ============================================================================
-- CREATE TENANT_ROLES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tenant_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenant_agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6B7280', -- Gray default
  hierarchy_level INT NOT NULL DEFAULT 50,
  is_system_default BOOLEAN DEFAULT false,
  is_immutable BOOLEAN DEFAULT false, -- Cannot be deleted (for owner role)
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Ensure unique role names per tenant
  CONSTRAINT unique_role_name_per_tenant UNIQUE (tenant_id, name),
  CONSTRAINT unique_role_slug_per_tenant UNIQUE (tenant_id, slug),
  
  -- Hierarchy levels: owner=100, admin=80, manager=60, chatter=40, pending=10
  CONSTRAINT valid_hierarchy_level CHECK (hierarchy_level >= 0 AND hierarchy_level <= 100)
);

-- Add indexes
CREATE INDEX idx_tenant_roles_tenant_id ON public.tenant_roles(tenant_id);
CREATE INDEX idx_tenant_roles_slug ON public.tenant_roles(tenant_id, slug);
CREATE INDEX idx_tenant_roles_hierarchy ON public.tenant_roles(tenant_id, hierarchy_level DESC);

-- Add comment
COMMENT ON TABLE public.tenant_roles IS 'Custom roles defined per tenant with hierarchy levels';

-- ============================================================================
-- CREATE TENANT_ROLE_PERMISSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tenant_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.tenant_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions_catalog(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id),
  
  -- Ensure unique permission per role
  CONSTRAINT unique_permission_per_role UNIQUE (role_id, permission_id)
);

-- Add indexes
CREATE INDEX idx_tenant_role_permissions_role ON public.tenant_role_permissions(role_id);
CREATE INDEX idx_tenant_role_permissions_permission ON public.tenant_role_permissions(permission_id);

-- Add comment
COMMENT ON TABLE public.tenant_role_permissions IS 'Junction table linking roles to their granted permissions';

-- ============================================================================
-- RLS POLICIES FOR TENANT_ROLES
-- ============================================================================

ALTER TABLE public.tenant_roles ENABLE ROW LEVEL SECURITY;

-- Users can view roles in their tenant
CREATE POLICY "tenant_roles_select"
  ON public.tenant_roles FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    OR public.is_platform_admin()
  );

-- Owners and admins can create roles
CREATE POLICY "tenant_roles_insert"
  ON public.tenant_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );

-- Owners and admins can update roles (except immutable ones by non-owners)
CREATE POLICY "tenant_roles_update"
  ON public.tenant_roles FOR UPDATE
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
  );

-- Only owners can delete roles (and not immutable ones)
CREATE POLICY "tenant_roles_delete"
  ON public.tenant_roles FOR DELETE
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND is_immutable = false
    AND EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = auth.uid()
      AND tm.role = 'owner'
    )
  );

-- Service role bypass
CREATE POLICY "service_tenant_roles"
  ON public.tenant_roles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- RLS POLICIES FOR TENANT_ROLE_PERMISSIONS
-- ============================================================================

ALTER TABLE public.tenant_role_permissions ENABLE ROW LEVEL SECURITY;

-- Users can view permissions for roles in their tenant
CREATE POLICY "tenant_role_permissions_select"
  ON public.tenant_role_permissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_roles tr
      WHERE tr.id = role_id
      AND (
        tr.tenant_id = public.get_user_tenant_id()
        OR public.is_platform_admin()
      )
    )
  );

-- Owners and admins can grant permissions
CREATE POLICY "tenant_role_permissions_insert"
  ON public.tenant_role_permissions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_roles tr
      JOIN public.team_members tm ON tm.tenant_id = tr.tenant_id
      WHERE tr.id = role_id
      AND tm.id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );

-- Owners and admins can revoke permissions
CREATE POLICY "tenant_role_permissions_delete"
  ON public.tenant_role_permissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_roles tr
      JOIN public.team_members tm ON tm.tenant_id = tr.tenant_id
      WHERE tr.id = role_id
      AND tm.id = auth.uid()
      AND tm.role IN ('owner', 'admin')
    )
  );

-- Service role bypass
CREATE POLICY "service_tenant_role_permissions"
  ON public.tenant_role_permissions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- UPDATE TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_tenant_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenant_roles_updated_at
  BEFORE UPDATE ON public.tenant_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_roles_updated_at();

-- ============================================================================
-- HELPER FUNCTION: Get role by slug for a tenant
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_role_id_by_slug(p_tenant_id UUID, p_slug TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM public.tenant_roles
  WHERE tenant_id = p_tenant_id AND slug = p_slug
  LIMIT 1;
$$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

