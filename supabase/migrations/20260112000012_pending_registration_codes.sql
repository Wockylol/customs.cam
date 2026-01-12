-- ============================================================================
-- PENDING REGISTRATION CODES
-- ============================================================================
-- This migration updates the registration code system so that:
-- 1. Codes are no longer role-dependent
-- 2. Users who sign up with a code are set to 'pending' status
-- 3. Admins approve users and set their role during approval
-- ============================================================================

-- ============================================================================
-- 1. UPDATE GENERATE REGISTRATION CODE FUNCTION
-- ============================================================================
-- Simplified - no longer requires a role parameter
-- All codes will create pending users that need approval

CREATE OR REPLACE FUNCTION public.generate_registration_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_user_role TEXT;
  v_code TEXT;
BEGIN
  -- Get the current user's tenant and role
  SELECT tenant_id, role INTO v_tenant_id, v_user_role
  FROM team_members
  WHERE id = auth.uid();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'You must be a member of a tenant to generate codes.';
  END IF;

  -- Check if user has permission (owner or admin)
  IF v_user_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Only owners and admins can generate registration codes.';
  END IF;

  -- Generate a short, memorable code (8 characters, alphanumeric uppercase)
  v_code := upper(replace(substring(gen_random_uuid()::text FROM 1 FOR 8), '-', ''));
  -- Replace ambiguous characters (O->0, I->1)
  v_code := replace(replace(v_code, 'O', '0'), 'I', '1');

  -- Update the tenant with the new code (set role to pending)
  UPDATE tenant_agencies
  SET 
    registration_code = v_code,
    registration_code_role = 'pending',
    registration_code_enabled = true,
    registration_code_updated_at = now()
  WHERE id = v_tenant_id;

  RETURN v_code;
END;
$$;

COMMENT ON FUNCTION public.generate_registration_code() IS 'Generates a new registration code for the tenant. Users who sign up with this code will be pending approval.';

-- ============================================================================
-- 2. UPDATE VALIDATE REGISTRATION CODE FUNCTION
-- ============================================================================
-- Now only returns tenant info, no role (since all users start as pending)

CREATE OR REPLACE FUNCTION public.validate_registration_code(p_code TEXT)
RETURNS TABLE (
  tenant_id UUID,
  tenant_name TEXT,
  tenant_slug TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ta.id,
    ta.name,
    ta.slug
  FROM tenant_agencies ta
  WHERE ta.registration_code = upper(p_code)
    AND ta.registration_code_enabled = true
    AND ta.is_active = true;
END;
$$;

COMMENT ON FUNCTION public.validate_registration_code IS 'Validates a registration code and returns tenant info if valid.';

-- ============================================================================
-- 3. UPDATE ACCEPT REGISTRATION CODE FUNCTION
-- ============================================================================
-- Now creates users with 'pending' role instead of a predefined role

CREATE OR REPLACE FUNCTION public.accept_registration_code(
  p_user_id UUID,
  p_code TEXT,
  p_user_email TEXT,
  p_user_full_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant RECORD;
BEGIN
  -- Find the tenant with this code
  SELECT id, name INTO v_tenant
  FROM tenant_agencies
  WHERE registration_code = upper(p_code)
    AND registration_code_enabled = true
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or disabled registration code.';
  END IF;

  -- Check if user is already a member
  IF EXISTS (SELECT 1 FROM team_members WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User is already a member of a team.';
  END IF;

  -- Create the team member with PENDING role (needs approval)
  INSERT INTO team_members (id, email, full_name, role, is_active, tenant_id)
  VALUES (p_user_id, p_user_email, p_user_full_name, 'pending'::team_role, true, v_tenant.id);

  RETURN v_tenant.id;
END;
$$;

COMMENT ON FUNCTION public.accept_registration_code IS 'Creates a team member with pending status when signing up with a registration code. User needs approval to access the system.';

-- ============================================================================
-- 4. UPDATE GET REGISTRATION CODE INFO FUNCTION
-- ============================================================================
-- Simplified to not return role (since it's always pending now)

CREATE OR REPLACE FUNCTION public.get_registration_code_info()
RETURNS TABLE (
  code TEXT,
  enabled BOOLEAN,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_user_role TEXT;
BEGIN
  -- Get the current user's tenant and role
  SELECT tm.tenant_id, tm.role INTO v_tenant_id, v_user_role
  FROM team_members tm
  WHERE tm.id = auth.uid();

  IF v_tenant_id IS NULL THEN
    RETURN;
  END IF;

  -- Only owners and admins can see the code
  IF v_user_role NOT IN ('owner', 'admin') THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    ta.registration_code,
    ta.registration_code_enabled,
    ta.registration_code_updated_at
  FROM tenant_agencies ta
  WHERE ta.id = v_tenant_id;
END;
$$;

COMMENT ON FUNCTION public.get_registration_code_info IS 'Returns registration code info for admins. Role is no longer returned since all signups are pending.';

-- ============================================================================
-- 5. UPDATE EXISTING CODES TO PENDING (optional cleanup)
-- ============================================================================
-- Set all existing registration_code_role to 'pending' for consistency

UPDATE tenant_agencies
SET registration_code_role = 'pending'
WHERE registration_code IS NOT NULL;

