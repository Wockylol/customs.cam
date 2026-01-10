-- ============================================================================
-- MULTI-TENANT SAAS ARCHITECTURE - PHASE 1C: CREATE FIRST-PARTY TENANT
-- ============================================================================
-- This migration:
-- 1. Creates your first-party tenant agency
-- 2. Backfills all existing data with the tenant_id
-- 3. Enables all capabilities for the first-party tenant
-- ============================================================================

-- ============================================================================
-- 1. CREATE THE FIRST-PARTY TENANT
-- ============================================================================
-- IMPORTANT: You will need to update the owner_user_id after running this
-- migration to match your actual user ID.

-- Create the first-party tenant
INSERT INTO public.tenant_agencies (id, name, slug, is_active, settings)
VALUES (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'LuxeLab',  -- UPDATE THIS with your actual agency name
  'luxelab',          -- UPDATE THIS with your desired subdomain
  true,
  jsonb_build_object(
    'is_first_party', true,
    'created_at_migration', true
  )
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 2. BACKFILL TENANT_ID ON ALL EXISTING DATA
-- ============================================================================

-- Helper variable for the tenant ID
DO $$
DECLARE
  first_party_tenant_id UUID := 'a0000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  -- Team members
  UPDATE public.team_members SET tenant_id = first_party_tenant_id WHERE tenant_id IS NULL;
  
  -- Clients
  UPDATE public.clients SET tenant_id = first_party_tenant_id WHERE tenant_id IS NULL;
  
  -- Managed agencies (formerly agencies)
  UPDATE public.managed_agencies SET tenant_id = first_party_tenant_id WHERE tenant_id IS NULL;
  
  -- Custom requests
  UPDATE public.custom_requests SET tenant_id = first_party_tenant_id WHERE tenant_id IS NULL;
  
  -- Content scenes
  UPDATE public.content_scenes SET tenant_id = first_party_tenant_id WHERE tenant_id IS NULL;
  
  -- Client scene assignments
  UPDATE public.client_scene_assignments SET tenant_id = first_party_tenant_id WHERE tenant_id IS NULL;
  
  -- Chatter sales
  UPDATE public.chatter_sales SET tenant_id = first_party_tenant_id WHERE tenant_id IS NULL;
  
  -- Chatter assignments
  UPDATE public.chatter_assignments SET tenant_id = first_party_tenant_id WHERE tenant_id IS NULL;
  
  -- Notifications
  UPDATE public.notifications SET tenant_id = first_party_tenant_id WHERE tenant_id IS NULL;
  
  -- Notification recipients
  UPDATE public.notification_recipients SET tenant_id = first_party_tenant_id WHERE tenant_id IS NULL;
  
  -- SMS conversations
  UPDATE public.sms_conversations SET tenant_id = first_party_tenant_id WHERE tenant_id IS NULL;
  
  -- SMS messages
  UPDATE public.sms_messages SET tenant_id = first_party_tenant_id WHERE tenant_id IS NULL;
  
  -- Activity logs
  UPDATE public.activity_logs SET tenant_id = first_party_tenant_id WHERE tenant_id IS NULL;
  
  -- Client preferences
  UPDATE public.client_preferences SET tenant_id = first_party_tenant_id WHERE tenant_id IS NULL;
  
  -- Client personal info
  UPDATE public.client_personal_info SET tenant_id = first_party_tenant_id WHERE tenant_id IS NULL;
  
  -- Client notes
  UPDATE public.client_notes SET tenant_id = first_party_tenant_id WHERE tenant_id IS NULL;
  
  -- Client idiolect analysis
  UPDATE public.client_idiolect_analysis SET tenant_id = first_party_tenant_id WHERE tenant_id IS NULL;
  
  -- Client platforms
  UPDATE public.client_platforms SET tenant_id = first_party_tenant_id WHERE tenant_id IS NULL;
  
  -- Custom notes
  UPDATE public.custom_notes SET tenant_id = first_party_tenant_id WHERE tenant_id IS NULL;
  
  -- Content uploads
  UPDATE public.content_uploads SET tenant_id = first_party_tenant_id WHERE tenant_id IS NULL;
  
  -- Scene content uploads
  UPDATE public.scene_content_uploads SET tenant_id = first_party_tenant_id WHERE tenant_id IS NULL;
  
  -- Scene example media
  UPDATE public.scene_example_media SET tenant_id = first_party_tenant_id WHERE tenant_id IS NULL;
  
  -- Conditional updates for tables that may not exist
  
  -- Attendance records
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_records') THEN
    EXECUTE 'UPDATE public.attendance_records SET tenant_id = $1 WHERE tenant_id IS NULL' USING first_party_tenant_id;
  END IF;
  
  -- Payroll settings
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_settings') THEN
    EXECUTE 'UPDATE public.payroll_settings SET tenant_id = $1 WHERE tenant_id IS NULL' USING first_party_tenant_id;
  END IF;
  
  -- Payroll bonuses
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_bonuses') THEN
    EXECUTE 'UPDATE public.payroll_bonuses SET tenant_id = $1 WHERE tenant_id IS NULL' USING first_party_tenant_id;
  END IF;
  
  -- Fan notes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fan_notes') THEN
    EXECUTE 'UPDATE public.fan_notes SET tenant_id = $1 WHERE tenant_id IS NULL' USING first_party_tenant_id;
  END IF;
  
  -- SMS templates
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sms_templates') THEN
    EXECUTE 'UPDATE public.sms_templates SET tenant_id = $1 WHERE tenant_id IS NULL' USING first_party_tenant_id;
  END IF;
  
  -- Lead activities
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_activities') THEN
    EXECUTE 'UPDATE public.lead_activities SET tenant_id = $1 WHERE tenant_id IS NULL' USING first_party_tenant_id;
  END IF;
  
  -- Platform interests
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'platform_interests') THEN
    EXECUTE 'UPDATE public.platform_interests SET tenant_id = $1 WHERE tenant_id IS NULL' USING first_party_tenant_id;
  END IF;
  
  -- Client questionnaire
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_questionnaire') THEN
    EXECUTE 'UPDATE public.client_questionnaire SET tenant_id = $1 WHERE tenant_id IS NULL' USING first_party_tenant_id;
  END IF;
  
  -- Thread notes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'thread_notes') THEN
    EXECUTE 'UPDATE public.thread_notes SET tenant_id = $1 WHERE tenant_id IS NULL' USING first_party_tenant_id;
  END IF;
  
  -- Client pins
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_pins') THEN
    EXECUTE 'UPDATE public.client_pins SET tenant_id = $1 WHERE tenant_id IS NULL' USING first_party_tenant_id;
  END IF;
  
  RAISE NOTICE 'Backfill complete for tenant: %', first_party_tenant_id;
END $$;

-- ============================================================================
-- 3. ENABLE ALL CAPABILITIES FOR FIRST-PARTY TENANT
-- ============================================================================

INSERT INTO public.tenant_capabilities (tenant_id, capability, enabled)
SELECT 
  'a0000000-0000-0000-0000-000000000001'::uuid,
  cap,
  true
FROM unnest(ARRAY[
  'sms_outbound',
  'sms_two_way',
  'client_chats',
  'payroll',
  'attendance',
  'scene_library',
  'voice_profiles',
  'advanced_sales',
  'b2b_partners',
  'leads_tracker'
]::public.tenant_capability[]) AS cap
ON CONFLICT (tenant_id, capability) DO UPDATE SET enabled = true;

-- ============================================================================
-- 4. SET FIRST ADMIN AS TENANT OWNER
-- ============================================================================
-- Find the first admin user and set them as the tenant owner

DO $$
DECLARE
  first_admin_id UUID;
BEGIN
  -- Find the first admin user
  SELECT id INTO first_admin_id
  FROM public.team_members
  WHERE role = 'admin' AND is_active = true
  ORDER BY created_at ASC
  LIMIT 1;
  
  IF first_admin_id IS NOT NULL THEN
    -- Update tenant owner
    UPDATE public.tenant_agencies
    SET owner_user_id = first_admin_id
    WHERE id = 'a0000000-0000-0000-0000-000000000001'::uuid;
    
    -- Update the team member role to 'owner'
    UPDATE public.team_members
    SET role = 'owner'
    WHERE id = first_admin_id;
    
    RAISE NOTICE 'Set tenant owner to user: %', first_admin_id;
  ELSE
    RAISE NOTICE 'No admin user found. Please manually set tenant owner.';
  END IF;
END $$;

-- ============================================================================
-- 5. CREATE PLATFORM ADMIN ENTRY FOR FIRST OWNER
-- ============================================================================
-- The first-party tenant owner is also a platform owner

DO $$
DECLARE
  owner_id UUID;
BEGIN
  SELECT owner_user_id INTO owner_id
  FROM public.tenant_agencies
  WHERE id = 'a0000000-0000-0000-0000-000000000001'::uuid;
  
  IF owner_id IS NOT NULL THEN
    INSERT INTO public.platform_admins (user_id, role, is_active)
    VALUES (owner_id, 'platform_owner', true)
    ON CONFLICT (user_id) DO UPDATE SET role = 'platform_owner', is_active = true;
    
    RAISE NOTICE 'Created platform admin for user: %', owner_id;
  END IF;
END $$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

