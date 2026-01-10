-- ============================================================================
-- FIX: Platform Admins RLS Infinite Recursion
-- ============================================================================
-- Run this if you got the infinite recursion error on platform_admins

-- Drop the problematic policies
DROP POLICY IF EXISTS "Platform admins can view platform admins" ON public.platform_admins;
DROP POLICY IF EXISTS "Platform owners can manage platform admins" ON public.platform_admins;

-- Create fixed policies that don't cause recursion
-- Users can view their own platform_admin record
CREATE POLICY "Users can view own platform admin record"
  ON public.platform_admins FOR SELECT
  USING (user_id = auth.uid());

-- Platform owners can view all platform admins
CREATE POLICY "Platform owners can view all platform admins"
  ON public.platform_admins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = auth.uid() 
      AND pa.role = 'platform_owner' 
      AND pa.is_active = true
    )
  );

-- Only platform owners can insert platform admins
CREATE POLICY "Platform owners can insert platform admins"
  ON public.platform_admins FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = auth.uid() 
      AND pa.role = 'platform_owner' 
      AND pa.is_active = true
    )
  );

-- Only platform owners can update platform admins
CREATE POLICY "Platform owners can update platform admins"
  ON public.platform_admins FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = auth.uid() 
      AND pa.role = 'platform_owner' 
      AND pa.is_active = true
    )
  );

-- Only platform owners can delete platform admins
CREATE POLICY "Platform owners can delete platform admins"
  ON public.platform_admins FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = auth.uid() 
      AND pa.role = 'platform_owner' 
      AND pa.is_active = true
    )
  );

-- ============================================================================
-- END FIX
-- ============================================================================

