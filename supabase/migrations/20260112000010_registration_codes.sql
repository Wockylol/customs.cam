-- ============================================================================
-- REGISTRATION CODES - Unlimited Use Agency Signup Codes
-- ============================================================================
-- This migration adds support for reusable registration codes that allow
-- unlimited signups under an agency. Codes can be regenerated which 
-- invalidates previous codes.
-- ============================================================================

-- ============================================================================
-- 1. ADD REGISTRATION CODE COLUMN TO TENANT AGENCIES
-- ============================================================================

ALTER TABLE public.tenant_agencies 
ADD COLUMN IF NOT EXISTS registration_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS registration_code_role TEXT DEFAULT 'chatter',
ADD COLUMN IF NOT EXISTS registration_code_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS registration_code_updated_at TIMESTAMPTZ;

-- Add constraint for valid roles
ALTER TABLE public.tenant_agencies
ADD CONSTRAINT registration_code_role_valid 
CHECK (registration_code_role IS NULL OR registration_code_role IN ('admin', 'manager', 'chatter'));

-- Index for code lookups
CREATE INDEX IF NOT EXISTS idx_tenant_agencies_registration_code 
ON public.tenant_agencies(registration_code) 
WHERE registration_code IS NOT NULL AND registration_code_enabled = true;

COMMENT ON COLUMN public.tenant_agencies.registration_code IS 'Reusable code for unlimited team member signups';
COMMENT ON COLUMN public.tenant_agencies.registration_code_role IS 'Role assigned to users who sign up with this code';
COMMENT ON COLUMN public.tenant_agencies.registration_code_enabled IS 'Whether the registration code is active';

-- ============================================================================
-- 2. FUNCTION: Generate Registration Code
-- ============================================================================
-- Generates or regenerates a registration code for the tenant.
-- Only owners and admins can generate codes.
-- Regenerating invalidates the previous code.

CREATE OR REPLACE FUNCTION public.generate_registration_code(
  p_role TEXT DEFAULT 'chatter'
)
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

  -- Validate role
  IF p_role NOT IN ('admin', 'manager', 'chatter') THEN
    RAISE EXCEPTION 'Invalid role. Must be admin, manager, or chatter.';
  END IF;

  -- Admins can only generate codes for chatters and managers
  IF v_user_role = 'admin' AND p_role = 'admin' THEN
    RAISE EXCEPTION 'Only owners can generate codes for admin role.';
  END IF;

  -- Generate a short, memorable code (8 characters, alphanumeric uppercase)
  v_code := upper(substring(encode(gen_random_bytes(6), 'base64') FROM 1 FOR 8));
  -- Replace ambiguous characters
  v_code := replace(replace(replace(replace(v_code, '/', 'X'), '+', 'Y'), 'O', '0'), 'I', '1');

  -- Update the tenant with the new code
  UPDATE tenant_agencies
  SET 
    registration_code = v_code,
    registration_code_role = p_role,
    registration_code_enabled = true,
    registration_code_updated_at = now()
  WHERE id = v_tenant_id;

  RETURN v_code;
END;
$$;

COMMENT ON FUNCTION public.generate_registration_code IS 'Generates a new registration code for the tenant. Invalidates any previous code.';

-- ============================================================================
-- 3. FUNCTION: Disable Registration Code
-- ============================================================================
-- Disables the current registration code without deleting it.

CREATE OR REPLACE FUNCTION public.disable_registration_code()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_user_role TEXT;
BEGIN
  -- Get the current user's tenant and role
  SELECT tenant_id, role INTO v_tenant_id, v_user_role
  FROM team_members
  WHERE id = auth.uid();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'You must be a member of a tenant.';
  END IF;

  -- Check if user has permission (owner or admin)
  IF v_user_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Only owners and admins can disable registration codes.';
  END IF;

  -- Disable the code
  UPDATE tenant_agencies
  SET 
    registration_code_enabled = false,
    registration_code_updated_at = now()
  WHERE id = v_tenant_id;

  RETURN true;
END;
$$;

-- ============================================================================
-- 4. FUNCTION: Enable Registration Code
-- ============================================================================
-- Re-enables an existing registration code.

CREATE OR REPLACE FUNCTION public.enable_registration_code()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_user_role TEXT;
  v_has_code BOOLEAN;
BEGIN
  -- Get the current user's tenant and role
  SELECT tenant_id, role INTO v_tenant_id, v_user_role
  FROM team_members
  WHERE id = auth.uid();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'You must be a member of a tenant.';
  END IF;

  -- Check if user has permission (owner or admin)
  IF v_user_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Only owners and admins can enable registration codes.';
  END IF;

  -- Check if a code exists
  SELECT registration_code IS NOT NULL INTO v_has_code
  FROM tenant_agencies
  WHERE id = v_tenant_id;

  IF NOT v_has_code THEN
    RAISE EXCEPTION 'No registration code exists. Generate one first.';
  END IF;

  -- Enable the code
  UPDATE tenant_agencies
  SET 
    registration_code_enabled = true,
    registration_code_updated_at = now()
  WHERE id = v_tenant_id;

  RETURN true;
END;
$$;

-- ============================================================================
-- 5. FUNCTION: Validate Registration Code
-- ============================================================================
-- Public function to validate a registration code.
-- Returns tenant info if valid.

CREATE OR REPLACE FUNCTION public.validate_registration_code(p_code TEXT)
RETURNS TABLE (
  tenant_id UUID,
  tenant_name TEXT,
  tenant_slug TEXT,
  role TEXT
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
    ta.slug,
    ta.registration_code_role
  FROM tenant_agencies ta
  WHERE ta.registration_code = upper(p_code)
    AND ta.registration_code_enabled = true
    AND ta.is_active = true;
END;
$$;

COMMENT ON FUNCTION public.validate_registration_code IS 'Validates a registration code and returns tenant info if valid.';

-- ============================================================================
-- 6. FUNCTION: Accept Registration Code (Sign Up)
-- ============================================================================
-- Called when a user signs up using a registration code.
-- Creates the team member with the code's assigned role.

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
  SELECT id, name, registration_code_role INTO v_tenant
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

  -- Create the team member
  INSERT INTO team_members (id, email, full_name, role, is_active, tenant_id)
  VALUES (p_user_id, p_user_email, p_user_full_name, v_tenant.registration_code_role, true, v_tenant.id);

  RETURN v_tenant.id;
END;
$$;

COMMENT ON FUNCTION public.accept_registration_code IS 'Creates a team member when signing up with a registration code.';

-- ============================================================================
-- 7. FUNCTION: Get Registration Code Info (for admins)
-- ============================================================================
-- Returns the current registration code info for the tenant.

CREATE OR REPLACE FUNCTION public.get_registration_code_info()
RETURNS TABLE (
  code TEXT,
  role TEXT,
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
    ta.registration_code_role,
    ta.registration_code_enabled,
    ta.registration_code_updated_at
  FROM tenant_agencies ta
  WHERE ta.id = v_tenant_id;
END;
$$;

COMMENT ON FUNCTION public.get_registration_code_info IS 'Returns registration code info for admins.';

