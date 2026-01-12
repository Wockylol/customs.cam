-- ============================================================================
-- FIX: Registration Code Generation Function
-- ============================================================================
-- Updates the generate_registration_code function to use gen_random_uuid()
-- instead of gen_random_bytes() which requires the pgcrypto extension.
-- ============================================================================

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
  -- Using gen_random_uuid() which is built-in and doesn't require pgcrypto
  v_code := upper(replace(substring(gen_random_uuid()::text FROM 1 FOR 8), '-', ''));
  -- Replace ambiguous characters (O->0, I->1)
  v_code := replace(replace(v_code, 'O', '0'), 'I', '1');

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

