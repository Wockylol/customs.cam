-- ============================================================================
-- MULTI-TENANT SAAS - SIGNUP FUNCTIONS
-- ============================================================================
-- This migration creates functions for handling multi-tenant signup flows:
-- 1. create_tenant_with_owner - Creates a new tenant and sets the owner
-- 2. accept_tenant_invite - Accepts an invite and creates the team member
-- ============================================================================

-- ============================================================================
-- 1. FUNCTION: Create Tenant with Owner
-- ============================================================================
-- Called after a user signs up to create their new agency.
-- The user must already exist in auth.users.

CREATE OR REPLACE FUNCTION public.create_tenant_with_owner(
  p_user_id UUID,
  p_tenant_name TEXT,
  p_tenant_slug TEXT,
  p_user_email TEXT,
  p_user_full_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Validate slug format
  IF NOT (p_tenant_slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' OR p_tenant_slug ~ '^[a-z0-9]$') THEN
    RAISE EXCEPTION 'Invalid slug format. Use lowercase letters, numbers, and hyphens only.';
  END IF;

  -- Check if slug is reserved
  IF p_tenant_slug IN ('www', 'admin', 'api', 'app', 'platform', 'support', 'help', 'billing', 'dashboard', 'login', 'signup', 'register') THEN
    RAISE EXCEPTION 'This agency name is reserved. Please choose a different name.';
  END IF;

  -- Check if slug already exists
  IF EXISTS (SELECT 1 FROM tenant_agencies WHERE slug = p_tenant_slug) THEN
    RAISE EXCEPTION 'This agency name is already taken. Please choose a different name.';
  END IF;

  -- Create the tenant
  INSERT INTO tenant_agencies (name, slug, owner_user_id, is_active, settings)
  VALUES (p_tenant_name, p_tenant_slug, p_user_id, true, '{}'::jsonb)
  RETURNING id INTO v_tenant_id;

  -- Create the team member as owner
  INSERT INTO team_members (id, email, full_name, role, is_active, tenant_id)
  VALUES (p_user_id, p_user_email, p_user_full_name, 'owner', true, v_tenant_id);

  -- Grant default capabilities to new tenant
  INSERT INTO tenant_capabilities (tenant_id, capability, enabled)
  VALUES 
    (v_tenant_id, 'sms_outbound', true),
    (v_tenant_id, 'client_chats', true);

  RETURN v_tenant_id;
END;
$$;

-- ============================================================================
-- 2. FUNCTION: Accept Tenant Invite
-- ============================================================================
-- Called when a user signs up via an invite link.
-- Creates the team member and marks the invite as accepted.

CREATE OR REPLACE FUNCTION public.accept_tenant_invite(
  p_user_id UUID,
  p_invite_token TEXT,
  p_user_email TEXT,
  p_user_full_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
  v_tenant_id UUID;
BEGIN
  -- Find the valid invite
  SELECT * INTO v_invite
  FROM tenant_invites
  WHERE token = p_invite_token
    AND accepted_at IS NULL
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite. Please request a new invite.';
  END IF;

  -- Check if email matches (if invite was for specific email)
  IF v_invite.email IS NOT NULL AND v_invite.email != '' AND lower(v_invite.email) != lower(p_user_email) THEN
    RAISE EXCEPTION 'This invite was sent to a different email address.';
  END IF;

  v_tenant_id := v_invite.tenant_id;

  -- Create the team member
  INSERT INTO team_members (id, email, full_name, role, is_active, tenant_id)
  VALUES (p_user_id, p_user_email, p_user_full_name, v_invite.role, true, v_tenant_id);

  -- Mark invite as accepted
  UPDATE tenant_invites
  SET accepted_at = now(), accepted_by_user_id = p_user_id
  WHERE id = v_invite.id;

  RETURN v_tenant_id;
END;
$$;

-- ============================================================================
-- 3. FUNCTION: Create Tenant Invite
-- ============================================================================
-- Creates an invite for a user to join a tenant.
-- Only tenant admins/owners can create invites.

CREATE OR REPLACE FUNCTION public.create_tenant_invite(
  p_email TEXT,
  p_role TEXT DEFAULT 'chatter',
  p_expires_in_days INTEGER DEFAULT 7
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_user_role TEXT;
  v_token TEXT;
BEGIN
  -- Get the current user's tenant and role
  SELECT tenant_id, role INTO v_tenant_id, v_user_role
  FROM team_members
  WHERE id = auth.uid();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'You must be a member of a tenant to create invites.';
  END IF;

  -- Check if user has permission to create invites (owner or admin)
  IF v_user_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Only owners and admins can create invites.';
  END IF;

  -- Validate role
  IF p_role NOT IN ('admin', 'manager', 'chatter') THEN
    RAISE EXCEPTION 'Invalid role. Must be admin, manager, or chatter.';
  END IF;

  -- Admins can only invite chatters and managers, not other admins
  IF v_user_role = 'admin' AND p_role = 'admin' THEN
    RAISE EXCEPTION 'Only owners can invite admins.';
  END IF;

  -- Generate a unique token
  v_token := encode(gen_random_bytes(32), 'hex');

  -- Create the invite
  INSERT INTO tenant_invites (tenant_id, email, token, role, invited_by, expires_at)
  VALUES (
    v_tenant_id, 
    NULLIF(p_email, ''), 
    v_token, 
    p_role::team_role, 
    auth.uid(), 
    now() + (p_expires_in_days || ' days')::interval
  );

  RETURN v_token;
END;
$$;

-- ============================================================================
-- 4. FUNCTION: Validate Invite Token
-- ============================================================================
-- Public function to validate an invite token without accepting it.
-- Returns invite details if valid.

CREATE OR REPLACE FUNCTION public.validate_invite_token(p_token TEXT)
RETURNS TABLE (
  tenant_name TEXT,
  tenant_slug TEXT,
  role TEXT,
  email TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ta.name,
    ta.slug,
    ti.role::TEXT,
    ti.email,
    ti.expires_at
  FROM tenant_invites ti
  JOIN tenant_agencies ta ON ta.id = ti.tenant_id
  WHERE ti.token = p_token
    AND ti.accepted_at IS NULL
    AND ti.expires_at > now()
    AND ta.is_active = true;
END;
$$;

-- ============================================================================
-- 5. FUNCTION: Check Slug Availability
-- ============================================================================
-- Public function to check if a tenant slug is available.

CREATE OR REPLACE FUNCTION public.check_slug_available(p_slug TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check format
  IF NOT (p_slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' OR p_slug ~ '^[a-z0-9]$') THEN
    RETURN false;
  END IF;

  -- Check reserved
  IF p_slug IN ('www', 'admin', 'api', 'app', 'platform', 'support', 'help', 'billing', 'dashboard', 'login', 'signup', 'register') THEN
    RETURN false;
  END IF;

  -- Check not taken
  RETURN NOT EXISTS (SELECT 1 FROM tenant_agencies WHERE slug = p_slug);
END;
$$;

-- ============================================================================
-- 6. RLS Policy for Tenant Invites - Allow Insert for Admins
-- ============================================================================
-- Update RLS to allow admins to insert invites

DROP POLICY IF EXISTS "Tenant admins can create invites" ON public.tenant_invites;
CREATE POLICY "Tenant admins can create invites"
  ON public.tenant_invites FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM team_members 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

