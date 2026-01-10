-- ============================================================================
-- MULTI-TENANT SAAS ARCHITECTURE - PHASE 1: CORE SCHEMA
-- ============================================================================
-- This migration creates the foundational multi-tenant structure:
-- 1. tenant_agencies - The core tenant table
-- 2. tenant_capabilities - Feature flags per tenant
-- 3. platform_admins - Global platform administrators
-- 4. tenant_invites - Invite system for user registration
-- ============================================================================

-- ============================================================================
-- 1. TENANT AGENCIES TABLE
-- ============================================================================
-- The core tenant table. Each agency that signs up gets a row here.
-- Your first-party agency will be the first tenant.

CREATE TABLE IF NOT EXISTS public.tenant_agencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_user_id UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- Constraints
  CONSTRAINT tenant_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' OR slug ~ '^[a-z0-9]$'),
  CONSTRAINT tenant_slug_reserved CHECK (slug NOT IN ('www', 'admin', 'api', 'app', 'platform', 'support', 'help', 'billing', 'dashboard', 'login', 'signup', 'register'))
);

-- Indexes for tenant lookup
CREATE INDEX IF NOT EXISTS idx_tenant_agencies_slug ON public.tenant_agencies(slug);
CREATE INDEX IF NOT EXISTS idx_tenant_agencies_owner ON public.tenant_agencies(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_agencies_active ON public.tenant_agencies(is_active) WHERE is_active = true;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_tenant_agencies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tenant_agencies_updated_at
  BEFORE UPDATE ON public.tenant_agencies
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_agencies_updated_at();

COMMENT ON TABLE public.tenant_agencies IS 'Core multi-tenant table. Each SaaS customer (agency) has one row.';
COMMENT ON COLUMN public.tenant_agencies.slug IS 'URL-safe identifier used for subdomains: {slug}.platform.com';
COMMENT ON COLUMN public.tenant_agencies.settings IS 'Tenant-specific settings: timezone, branding, etc.';

-- ============================================================================
-- 2. TENANT CAPABILITIES TABLE
-- ============================================================================
-- Feature flags per tenant. Controls what features each tenant can access.

CREATE TYPE public.tenant_capability AS ENUM (
  'sms_outbound',      -- Can send outbound SMS
  'sms_two_way',       -- Full 2-way SMS with inbound display
  'client_chats',      -- Real-time chat threads
  'payroll',           -- Payroll management
  'attendance',        -- Attendance tracking
  'scene_library',     -- Content scene management
  'voice_profiles',    -- Idiolect/voice analysis
  'advanced_sales',    -- Sales analytics and performance
  'b2b_partners',      -- Managed agency (B2B partner) tracking
  'leads_tracker',     -- Lead/prospect pipeline
  'automation_rules',  -- Future: automated workflows
  'api_access'         -- Future: API for integrations
);

CREATE TABLE IF NOT EXISTS public.tenant_capabilities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenant_agencies(id) ON DELETE CASCADE,
  capability public.tenant_capability NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  granted_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  granted_by UUID, -- Can be null for system-granted capabilities
  
  -- Each tenant can only have one entry per capability
  UNIQUE(tenant_id, capability)
);

CREATE INDEX IF NOT EXISTS idx_tenant_capabilities_tenant ON public.tenant_capabilities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_capabilities_enabled ON public.tenant_capabilities(tenant_id, capability) WHERE enabled = true;

COMMENT ON TABLE public.tenant_capabilities IS 'Feature flags per tenant. Controls access to platform features.';

-- ============================================================================
-- 3. PLATFORM ADMINS TABLE
-- ============================================================================
-- Global platform administrators. These are NOT tenant users.
-- They have cross-tenant access for platform management.

CREATE TYPE public.platform_admin_role AS ENUM (
  'platform_owner',    -- Full control, can manage other platform admins
  'platform_admin',    -- Can manage tenants, capabilities, impersonate
  'platform_support'   -- Read-only access for support purposes
);

CREATE TABLE IF NOT EXISTS public.platform_admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.platform_admin_role NOT NULL DEFAULT 'platform_support',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_platform_admins_user ON public.platform_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_admins_active ON public.platform_admins(is_active) WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER trigger_update_platform_admins_updated_at
  BEFORE UPDATE ON public.platform_admins
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_agencies_updated_at();

COMMENT ON TABLE public.platform_admins IS 'Global platform administrators with cross-tenant access.';

-- ============================================================================
-- 4. TENANT INVITES TABLE
-- ============================================================================
-- Invite system for user registration. Users can only join a tenant via invite.

CREATE TABLE IF NOT EXISTS public.tenant_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenant_agencies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  role TEXT NOT NULL DEFAULT 'chatter', -- Role to assign when accepted
  invited_by UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- Constraints
  CONSTRAINT invite_role_valid CHECK (role IN ('admin', 'manager', 'chatter')),
  CONSTRAINT invite_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX IF NOT EXISTS idx_tenant_invites_tenant ON public.tenant_invites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invites_token ON public.tenant_invites(token);
CREATE INDEX IF NOT EXISTS idx_tenant_invites_email ON public.tenant_invites(tenant_id, email);
-- Note: Cannot use now() in partial index predicate (not IMMUTABLE)
-- Filter expired invites at query time instead
CREATE INDEX IF NOT EXISTS idx_tenant_invites_pending ON public.tenant_invites(tenant_id, expires_at) 
  WHERE accepted_at IS NULL;

COMMENT ON TABLE public.tenant_invites IS 'Invite tokens for user registration. Users must have a valid invite to join a tenant.';

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Function to get tenant_id for the current authenticated user
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT tenant_id FROM public.team_members WHERE id = auth.uid() LIMIT 1;
$$;

-- Function to check if current user is a platform admin
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins 
    WHERE user_id = auth.uid() 
    AND is_active = true
  );
$$;

-- Function to check if a tenant has a specific capability
CREATE OR REPLACE FUNCTION public.tenant_has_capability(p_tenant_id UUID, p_capability public.tenant_capability)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_capabilities 
    WHERE tenant_id = p_tenant_id 
    AND capability = p_capability 
    AND enabled = true
  );
$$;

-- Function to check if current user's tenant has a capability
CREATE OR REPLACE FUNCTION public.current_tenant_has_capability(p_capability public.tenant_capability)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.tenant_has_capability(public.get_user_tenant_id(), p_capability);
$$;

COMMENT ON FUNCTION public.get_user_tenant_id() IS 'Returns the tenant_id for the currently authenticated user';
COMMENT ON FUNCTION public.is_platform_admin() IS 'Returns true if the current user is a platform admin';
COMMENT ON FUNCTION public.tenant_has_capability(UUID, public.tenant_capability) IS 'Checks if a tenant has a specific capability enabled';

-- ============================================================================
-- 6. ENABLE RLS ON NEW TABLES
-- ============================================================================

ALTER TABLE public.tenant_agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_invites ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. RLS POLICIES FOR NEW TABLES
-- ============================================================================

-- TENANT_AGENCIES policies
-- Users can view their own tenant
CREATE POLICY "Users can view own tenant"
  ON public.tenant_agencies FOR SELECT
  USING (
    id = public.get_user_tenant_id()
    OR public.is_platform_admin()
  );

-- Platform admins can manage all tenants
CREATE POLICY "Platform admins can manage tenants"
  ON public.tenant_agencies FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Service role has full access
CREATE POLICY "Service role full access to tenants"
  ON public.tenant_agencies FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- TENANT_CAPABILITIES policies
-- Users can view their tenant's capabilities
CREATE POLICY "Users can view own tenant capabilities"
  ON public.tenant_capabilities FOR SELECT
  USING (
    tenant_id = public.get_user_tenant_id()
    OR public.is_platform_admin()
  );

-- Platform admins can manage all capabilities
CREATE POLICY "Platform admins can manage capabilities"
  ON public.tenant_capabilities FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Service role has full access
CREATE POLICY "Service role full access to capabilities"
  ON public.tenant_capabilities FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- PLATFORM_ADMINS policies
-- Platform admins can view themselves
CREATE POLICY "Platform admins can view platform admins"
  ON public.platform_admins FOR SELECT
  USING (
    user_id = auth.uid()
    OR (public.is_platform_admin() AND (
      SELECT role FROM public.platform_admins WHERE user_id = auth.uid()
    ) = 'platform_owner'
    )
  );

-- Only platform owners can manage platform admins
CREATE POLICY "Platform owners can manage platform admins"
  ON public.platform_admins FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins 
      WHERE user_id = auth.uid() 
      AND role = 'platform_owner' 
      AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.platform_admins 
      WHERE user_id = auth.uid() 
      AND role = 'platform_owner' 
      AND is_active = true
    )
  );

-- Service role has full access
CREATE POLICY "Service role full access to platform admins"
  ON public.platform_admins FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- TENANT_INVITES policies
-- Tenant admins can manage invites for their tenant
CREATE POLICY "Tenant admins can view own tenant invites"
  ON public.tenant_invites FOR SELECT
  USING (
    tenant_id = public.get_user_tenant_id()
    OR public.is_platform_admin()
  );

CREATE POLICY "Tenant admins can create invites"
  ON public.tenant_invites FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Tenant admins can update invites"
  ON public.tenant_invites FOR UPDATE
  USING (
    tenant_id = public.get_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Tenant admins can delete invites"
  ON public.tenant_invites FOR DELETE
  USING (
    tenant_id = public.get_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- Public can read invites by token (for registration)
CREATE POLICY "Anyone can validate invite token"
  ON public.tenant_invites FOR SELECT
  TO anon
  USING (
    accepted_at IS NULL 
    AND expires_at > now()
  );

-- Service role has full access
CREATE POLICY "Service role full access to invites"
  ON public.tenant_invites FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

