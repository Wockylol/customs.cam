-- ============================================================================
-- MULTI-TENANT SAAS ARCHITECTURE - PHASE 1B: ADD TENANT_ID TO ALL TABLES
-- ============================================================================
-- This migration adds tenant_id to all tenant-scoped tables.
-- tenant_id is nullable initially to allow for gradual migration.
-- A future migration will make it NOT NULL after data backfill.
-- ============================================================================

-- ============================================================================
-- 1. UPDATE TEAM_MEMBERS ROLE ENUM TO INCLUDE 'OWNER'
-- ============================================================================

-- Add 'owner' to the team_role enum if it doesn't exist
DO $$
BEGIN
  -- Check if 'owner' value exists in the enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'owner' 
    AND enumtypid = 'public.team_role'::regtype
  ) THEN
    ALTER TYPE public.team_role ADD VALUE 'owner' BEFORE 'admin';
  END IF;
EXCEPTION
  WHEN others THEN
    -- If team_role doesn't exist as a type, skip this
    NULL;
END $$;

-- ============================================================================
-- 2. ADD TENANT_ID TO TEAM_MEMBERS
-- ============================================================================

ALTER TABLE public.team_members 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_agencies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_team_members_tenant ON public.team_members(tenant_id);

COMMENT ON COLUMN public.team_members.tenant_id IS 'The tenant agency this team member belongs to';

-- ============================================================================
-- 3. ADD TENANT_ID TO CLIENTS
-- ============================================================================

ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_agencies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_clients_tenant ON public.clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_username ON public.clients(tenant_id, username);

COMMENT ON COLUMN public.clients.tenant_id IS 'The tenant agency this client/creator belongs to';

-- ============================================================================
-- 4. RENAME AGENCIES TO MANAGED_AGENCIES AND ADD TENANT_ID
-- ============================================================================

-- Rename the table if it exists and hasn't been renamed yet
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agencies' AND table_schema = 'public') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'managed_agencies' AND table_schema = 'public') THEN
    ALTER TABLE public.agencies RENAME TO managed_agencies;
  END IF;
END $$;

-- Add tenant_id to managed_agencies
ALTER TABLE public.managed_agencies 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_agencies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_managed_agencies_tenant ON public.managed_agencies(tenant_id);

COMMENT ON TABLE public.managed_agencies IS 'B2B partner agencies that refer clients. These are CRM entities, NOT tenant agencies.';
COMMENT ON COLUMN public.managed_agencies.tenant_id IS 'The tenant agency that manages this B2B partner relationship';

-- ============================================================================
-- 5. ADD TENANT_ID TO CUSTOM_REQUESTS
-- ============================================================================

ALTER TABLE public.custom_requests 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_agencies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_custom_requests_tenant ON public.custom_requests(tenant_id);

-- ============================================================================
-- 6. ADD TENANT_ID TO CONTENT_SCENES
-- ============================================================================

ALTER TABLE public.content_scenes 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_agencies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_content_scenes_tenant ON public.content_scenes(tenant_id);

-- ============================================================================
-- 7. ADD TENANT_ID TO CLIENT_SCENE_ASSIGNMENTS
-- ============================================================================

ALTER TABLE public.client_scene_assignments 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_agencies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_client_scene_assignments_tenant ON public.client_scene_assignments(tenant_id);

-- ============================================================================
-- 8. ADD TENANT_ID TO CHATTER_SALES
-- ============================================================================

ALTER TABLE public.chatter_sales 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_agencies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_chatter_sales_tenant ON public.chatter_sales(tenant_id);

-- ============================================================================
-- 9. ADD TENANT_ID TO CHATTER_ASSIGNMENTS
-- ============================================================================

ALTER TABLE public.chatter_assignments 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_agencies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_chatter_assignments_tenant ON public.chatter_assignments(tenant_id);

-- ============================================================================
-- 10. ADD TENANT_ID TO NOTIFICATIONS
-- ============================================================================

ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_agencies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON public.notifications(tenant_id);

-- ============================================================================
-- 11. ADD TENANT_ID TO SMS_CONVERSATIONS
-- ============================================================================

ALTER TABLE public.sms_conversations 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_agencies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_sms_conversations_tenant ON public.sms_conversations(tenant_id);

-- ============================================================================
-- 12. ADD TENANT_ID TO ATTENDANCE_RECORDS
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_records' AND table_schema = 'public') THEN
    ALTER TABLE public.attendance_records 
      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_agencies(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_attendance_records_tenant ON public.attendance_records(tenant_id);
  END IF;
END $$;

-- ============================================================================
-- 13. ADD TENANT_ID TO ACTIVITY_LOGS
-- ============================================================================

ALTER TABLE public.activity_logs 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_agencies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant ON public.activity_logs(tenant_id);

-- ============================================================================
-- 14. ADD TENANT_ID TO CLIENT_PREFERENCES
-- ============================================================================

ALTER TABLE public.client_preferences 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_agencies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_client_preferences_tenant ON public.client_preferences(tenant_id);

-- ============================================================================
-- 15. ADD TENANT_ID TO CLIENT_PERSONAL_INFO
-- ============================================================================

ALTER TABLE public.client_personal_info 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_agencies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_client_personal_info_tenant ON public.client_personal_info(tenant_id);

-- ============================================================================
-- 16. ADD TENANT_ID TO CLIENT_NOTES
-- ============================================================================

ALTER TABLE public.client_notes 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_agencies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_client_notes_tenant ON public.client_notes(tenant_id);

-- ============================================================================
-- 17. ADD TENANT_ID TO CLIENT_IDIOLECT_ANALYSIS
-- ============================================================================

ALTER TABLE public.client_idiolect_analysis 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_agencies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_client_idiolect_analysis_tenant ON public.client_idiolect_analysis(tenant_id);

-- ============================================================================
-- 18. ADD TENANT_ID TO CLIENT_PLATFORMS
-- ============================================================================

ALTER TABLE public.client_platforms 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_agencies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_client_platforms_tenant ON public.client_platforms(tenant_id);

-- ============================================================================
-- 19. ADD TENANT_ID TO CUSTOM_NOTES
-- ============================================================================

ALTER TABLE public.custom_notes 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_agencies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_custom_notes_tenant ON public.custom_notes(tenant_id);

-- ============================================================================
-- 20. ADD TENANT_ID TO CONTENT_UPLOADS
-- ============================================================================

ALTER TABLE public.content_uploads 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_agencies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_content_uploads_tenant ON public.content_uploads(tenant_id);

-- ============================================================================
-- 21. ADD TENANT_ID TO SCENE_CONTENT_UPLOADS
-- ============================================================================

ALTER TABLE public.scene_content_uploads 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_agencies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_scene_content_uploads_tenant ON public.scene_content_uploads(tenant_id);

-- ============================================================================
-- 22. ADD TENANT_ID TO SCENE_EXAMPLE_MEDIA
-- ============================================================================

ALTER TABLE public.scene_example_media 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_agencies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_scene_example_media_tenant ON public.scene_example_media(tenant_id);

-- ============================================================================
-- 23. ADD TENANT_ID TO NOTIFICATION_RECIPIENTS
-- ============================================================================
-- Note: notification_recipients inherits tenant through notification_id join,
-- but adding tenant_id for RLS performance

ALTER TABLE public.notification_recipients 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_agencies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notification_recipients_tenant ON public.notification_recipients(tenant_id);

-- ============================================================================
-- 24. ADD TENANT_ID TO SMS_MESSAGES
-- ============================================================================
-- Note: sms_messages inherits tenant through conversation_id join,
-- but adding tenant_id for RLS performance

ALTER TABLE public.sms_messages 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_agencies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_sms_messages_tenant ON public.sms_messages(tenant_id);

-- ============================================================================
-- 25. ADD TENANT_ID TO PAYROLL TABLES
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_settings' AND table_schema = 'public') THEN
    ALTER TABLE public.payroll_settings 
      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_agencies(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_payroll_settings_tenant ON public.payroll_settings(tenant_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payroll_bonuses' AND table_schema = 'public') THEN
    ALTER TABLE public.payroll_bonuses 
      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_agencies(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_payroll_bonuses_tenant ON public.payroll_bonuses(tenant_id);
  END IF;
END $$;

-- ============================================================================
-- 26. ADD TENANT_ID TO FAN_NOTES
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fan_notes' AND table_schema = 'public') THEN
    ALTER TABLE public.fan_notes 
      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_agencies(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_fan_notes_tenant ON public.fan_notes(tenant_id);
  END IF;
END $$;

-- ============================================================================
-- 27. ADD TENANT_ID TO SMS_TEMPLATES
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sms_templates' AND table_schema = 'public') THEN
    ALTER TABLE public.sms_templates 
      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_agencies(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_sms_templates_tenant ON public.sms_templates(tenant_id);
  END IF;
END $$;

-- ============================================================================
-- 28. ADD TENANT_ID TO LEAD_ACTIVITIES
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_activities' AND table_schema = 'public') THEN
    ALTER TABLE public.lead_activities 
      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_agencies(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_lead_activities_tenant ON public.lead_activities(tenant_id);
  END IF;
END $$;

-- ============================================================================
-- 29. ADD TENANT_ID TO PLATFORM_INTERESTS
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'platform_interests' AND table_schema = 'public') THEN
    ALTER TABLE public.platform_interests 
      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_agencies(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_platform_interests_tenant ON public.platform_interests(tenant_id);
  END IF;
END $$;

-- ============================================================================
-- 30. ADD TENANT_ID TO CLIENT_QUESTIONNAIRE (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_questionnaire' AND table_schema = 'public') THEN
    ALTER TABLE public.client_questionnaire 
      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_agencies(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_client_questionnaire_tenant ON public.client_questionnaire(tenant_id);
  END IF;
END $$;

-- ============================================================================
-- 31. ADD TENANT_ID TO THREAD_NOTES (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'thread_notes' AND table_schema = 'public') THEN
    ALTER TABLE public.thread_notes 
      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_agencies(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_thread_notes_tenant ON public.thread_notes(tenant_id);
  END IF;
END $$;

-- ============================================================================
-- 32. ADD TENANT_ID TO CLIENT_PINS (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_pins' AND table_schema = 'public') THEN
    ALTER TABLE public.client_pins 
      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_agencies(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_client_pins_tenant ON public.client_pins(tenant_id);
  END IF;
END $$;

-- ============================================================================
-- UPDATE get_user_tenant_id FUNCTION
-- ============================================================================
-- Ensure the function works even if team_members doesn't have tenant_id yet

CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT tenant_id FROM public.team_members WHERE id = auth.uid() AND tenant_id IS NOT NULL LIMIT 1;
$$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

