-- ============================================================================
-- DYNAMIC ROLES & PERMISSIONS SYSTEM - PHASE 4: TEAM MEMBERS ROLE_ID
-- ============================================================================
-- This migration adds role_id column to team_members and migrates existing
-- users from the enum role to the new role reference.
-- ============================================================================

-- ============================================================================
-- ADD ROLE_ID COLUMN TO TEAM_MEMBERS
-- ============================================================================

ALTER TABLE public.team_members
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.tenant_roles(id);

-- Add index for role_id lookups
CREATE INDEX IF NOT EXISTS idx_team_members_role_id ON public.team_members(role_id);

-- ============================================================================
-- MIGRATE EXISTING USERS TO NEW ROLE SYSTEM
-- ============================================================================

-- Update team members to reference the appropriate tenant role
UPDATE public.team_members tm
SET role_id = tr.id
FROM public.tenant_roles tr
WHERE tm.tenant_id = tr.tenant_id
AND tr.slug = tm.role::text
AND tm.role_id IS NULL;

-- ============================================================================
-- HELPER FUNCTION: Get user's role hierarchy level
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_role_hierarchy()
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (
      SELECT tr.hierarchy_level
      FROM public.team_members tm
      JOIN public.tenant_roles tr ON tr.id = tm.role_id
      WHERE tm.id = auth.uid()
    ),
    -- Fallback to old role column for backwards compatibility
    CASE 
      WHEN (SELECT role FROM public.team_members WHERE id = auth.uid()) = 'owner' THEN 100
      WHEN (SELECT role FROM public.team_members WHERE id = auth.uid()) = 'admin' THEN 80
      WHEN (SELECT role FROM public.team_members WHERE id = auth.uid()) = 'manager' THEN 60
      WHEN (SELECT role FROM public.team_members WHERE id = auth.uid()) = 'chatter' THEN 40
      ELSE 0
    END
  );
$$;

-- ============================================================================
-- HELPER FUNCTION: Check if user has minimum hierarchy level
-- ============================================================================

CREATE OR REPLACE FUNCTION public.has_role_level(min_level INT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.get_user_role_hierarchy() >= min_level;
$$;

-- ============================================================================
-- HELPER FUNCTION: Check if user is owner or admin
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_tenant_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.get_user_role_hierarchy() >= 80; -- Admin level or higher
$$;

-- ============================================================================
-- HELPER FUNCTION: Check if user is owner
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_tenant_owner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.get_user_role_hierarchy() >= 100; -- Owner level
$$;

-- ============================================================================
-- HELPER FUNCTION: Check if user is at least manager
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_tenant_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.get_user_role_hierarchy() >= 60; -- Manager level or higher
$$;

-- ============================================================================
-- UPDATE TRIGGER: Keep old role column in sync (for backwards compatibility)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_team_member_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role_slug TEXT;
BEGIN
  -- If role_id was set, update the legacy role column
  IF NEW.role_id IS NOT NULL AND (OLD.role_id IS NULL OR NEW.role_id != OLD.role_id) THEN
    SELECT slug INTO v_role_slug FROM public.tenant_roles WHERE id = NEW.role_id;
    
    -- Map custom roles to closest standard role for backwards compatibility
    IF v_role_slug IN ('owner', 'admin', 'manager', 'chatter', 'pending') THEN
      NEW.role = v_role_slug::text;
    ELSE
      -- For custom roles, use the hierarchy level to determine the legacy role
      SELECT 
        CASE 
          WHEN hierarchy_level >= 100 THEN 'owner'
          WHEN hierarchy_level >= 80 THEN 'admin'
          WHEN hierarchy_level >= 60 THEN 'manager'
          WHEN hierarchy_level >= 40 THEN 'chatter'
          ELSE 'pending'
        END INTO NEW.role
      FROM public.tenant_roles WHERE id = NEW.role_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sync_team_member_role ON public.team_members;

CREATE TRIGGER trigger_sync_team_member_role
  BEFORE INSERT OR UPDATE OF role_id ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_team_member_role();

-- ============================================================================
-- VIEW: Team members with role details
-- ============================================================================

CREATE OR REPLACE VIEW public.team_members_with_roles AS
SELECT 
  tm.*,
  tr.name AS role_name,
  tr.slug AS role_slug,
  tr.hierarchy_level,
  tr.color AS role_color,
  tr.is_system_default AS is_system_role
FROM public.team_members tm
LEFT JOIN public.tenant_roles tr ON tr.id = tm.role_id;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

