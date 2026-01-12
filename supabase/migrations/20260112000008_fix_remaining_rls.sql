-- ============================================================================
-- FIX REMAINING RLS POLICIES
-- ============================================================================
-- This fixes tables that were missed or have incomplete policies
-- ============================================================================

-- ============================================================================
-- 0. ENSURE HELPER FUNCTIONS EXIST
-- ============================================================================

-- Auto-fill tenant_id from team_members (for authenticated users)
CREATE OR REPLACE FUNCTION public.auto_set_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT tenant_id INTO NEW.tenant_id
    FROM public.team_members
    WHERE id = auth.uid()
    AND tenant_id IS NOT NULL
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

-- Auto-fill tenant_id from clients table (for client-related tables)
CREATE OR REPLACE FUNCTION public.auto_set_tenant_id_from_client()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.tenant_id IS NULL AND NEW.client_id IS NOT NULL THEN
    SELECT tenant_id INTO NEW.tenant_id
    FROM public.clients
    WHERE id = NEW.client_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_set_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_set_tenant_id() TO service_role;
GRANT EXECUTE ON FUNCTION public.auto_set_tenant_id_from_client() TO anon;
GRANT EXECUTE ON FUNCTION public.auto_set_tenant_id_from_client() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_set_tenant_id_from_client() TO service_role;


-- ============================================================================
-- 1. FIX MESSAGES TABLE (chat messages)
-- ============================================================================

DO $$
DECLARE
  policy_name TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages' AND table_schema = 'public') THEN
    -- Drop existing policies
    FOR policy_name IN 
      SELECT policyname FROM pg_policies WHERE tablename = 'messages' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.messages', policy_name);
    END LOOP;
    
    EXECUTE 'ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY';
    
    -- Check if has tenant_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'tenant_id') THEN
      EXECUTE '
        CREATE POLICY "messages_auth_select" ON public.messages FOR SELECT TO authenticated
        USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id() OR public.is_platform_admin())
      ';
      EXECUTE '
        CREATE POLICY "messages_auth_insert" ON public.messages FOR INSERT TO authenticated
        WITH CHECK (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
      ';
      EXECUTE '
        CREATE POLICY "messages_auth_update" ON public.messages FOR UPDATE TO authenticated
        USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
      ';
      EXECUTE '
        CREATE POLICY "messages_auth_delete" ON public.messages FOR DELETE TO authenticated
        USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
      ';
    ELSE
      -- No tenant_id - allow all authenticated
      EXECUTE 'CREATE POLICY "messages_auth_all" ON public.messages FOR ALL TO authenticated USING (true) WITH CHECK (true)';
    END IF;
    
    EXECUTE 'CREATE POLICY "messages_anon_select" ON public.messages FOR SELECT TO anon USING (true)';
    EXECUTE 'CREATE POLICY "messages_service" ON public.messages FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
END $$;


-- ============================================================================
-- 2. FIX THREADS TABLE
-- ============================================================================

DO $$
DECLARE
  policy_name TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'threads' AND table_schema = 'public') THEN
    FOR policy_name IN 
      SELECT policyname FROM pg_policies WHERE tablename = 'threads' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.threads', policy_name);
    END LOOP;
    
    EXECUTE 'ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY';
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'threads' AND column_name = 'tenant_id') THEN
      EXECUTE '
        CREATE POLICY "threads_auth_select" ON public.threads FOR SELECT TO authenticated
        USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id() OR public.is_platform_admin())
      ';
      EXECUTE '
        CREATE POLICY "threads_auth_insert" ON public.threads FOR INSERT TO authenticated
        WITH CHECK (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
      ';
      EXECUTE '
        CREATE POLICY "threads_auth_update" ON public.threads FOR UPDATE TO authenticated
        USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
      ';
      EXECUTE '
        CREATE POLICY "threads_auth_delete" ON public.threads FOR DELETE TO authenticated
        USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
      ';
    ELSE
      EXECUTE 'CREATE POLICY "threads_auth_all" ON public.threads FOR ALL TO authenticated USING (true) WITH CHECK (true)';
    END IF;
    
    EXECUTE 'CREATE POLICY "threads_anon_select" ON public.threads FOR SELECT TO anon USING (true)';
    EXECUTE 'CREATE POLICY "threads_service" ON public.threads FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
END $$;


-- ============================================================================
-- 3. FIX SMS_CONVERSATIONS (add delete policy)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sms_conversations' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "sms_conversations_auth_delete" ON public.sms_conversations;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sms_conversations' AND column_name = 'tenant_id') THEN
      EXECUTE '
        CREATE POLICY "sms_conversations_auth_delete" ON public.sms_conversations FOR DELETE TO authenticated
        USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
      ';
    END IF;
  END IF;
END $$;


-- ============================================================================
-- 4. FIX NOTIFICATION_RECIPIENTS (add delete policy)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_recipients' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "notification_recipients_auth_delete" ON public.notification_recipients;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_recipients' AND column_name = 'tenant_id') THEN
      EXECUTE '
        CREATE POLICY "notification_recipients_auth_delete" ON public.notification_recipients FOR DELETE TO authenticated
        USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id() OR team_member_id = auth.uid())
      ';
    END IF;
  END IF;
END $$;


-- ============================================================================
-- 5. FIX CLIENT-RELATED TABLES THAT WERE MISSED
-- ============================================================================

-- client_content_details
DO $$
DECLARE
  policy_name TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_content_details' AND table_schema = 'public') THEN
    FOR policy_name IN 
      SELECT policyname FROM pg_policies WHERE tablename = 'client_content_details' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.client_content_details', policy_name);
    END LOOP;
    
    EXECUTE 'ALTER TABLE public.client_content_details ENABLE ROW LEVEL SECURITY';
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_content_details' AND column_name = 'tenant_id') THEN
      EXECUTE '
        CREATE POLICY "client_content_details_auth_select" ON public.client_content_details FOR SELECT TO authenticated
        USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id() OR public.is_platform_admin())
      ';
      EXECUTE '
        CREATE POLICY "client_content_details_auth_insert" ON public.client_content_details FOR INSERT TO authenticated
        WITH CHECK (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
      ';
      EXECUTE '
        CREATE POLICY "client_content_details_auth_update" ON public.client_content_details FOR UPDATE TO authenticated
        USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
      ';
      EXECUTE '
        CREATE POLICY "client_content_details_auth_delete" ON public.client_content_details FOR DELETE TO authenticated
        USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
      ';
    ELSE
      EXECUTE 'CREATE POLICY "client_content_details_auth_all" ON public.client_content_details FOR ALL TO authenticated USING (true) WITH CHECK (true)';
    END IF;
    
    EXECUTE 'CREATE POLICY "client_content_details_anon_select" ON public.client_content_details FOR SELECT TO anon USING (true)';
    EXECUTE 'CREATE POLICY "client_content_details_anon_write" ON public.client_content_details FOR INSERT TO anon WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "client_content_details_anon_update" ON public.client_content_details FOR UPDATE TO anon USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "client_content_details_service" ON public.client_content_details FOR ALL TO service_role USING (true) WITH CHECK (true)';
    
    -- Add trigger for tenant_id auto-fill
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_content_details' AND column_name = 'client_id') THEN
      DROP TRIGGER IF EXISTS auto_tenant_id_client_content_details ON public.client_content_details;
      CREATE TRIGGER auto_tenant_id_client_content_details BEFORE INSERT ON public.client_content_details
        FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id_from_client();
    END IF;
  END IF;
END $$;


-- client_personas
DO $$
DECLARE
  policy_name TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_personas' AND table_schema = 'public') THEN
    FOR policy_name IN 
      SELECT policyname FROM pg_policies WHERE tablename = 'client_personas' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.client_personas', policy_name);
    END LOOP;
    
    EXECUTE 'ALTER TABLE public.client_personas ENABLE ROW LEVEL SECURITY';
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_personas' AND column_name = 'tenant_id') THEN
      EXECUTE '
        CREATE POLICY "client_personas_auth_select" ON public.client_personas FOR SELECT TO authenticated
        USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id() OR public.is_platform_admin())
      ';
      EXECUTE '
        CREATE POLICY "client_personas_auth_insert" ON public.client_personas FOR INSERT TO authenticated
        WITH CHECK (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
      ';
      EXECUTE '
        CREATE POLICY "client_personas_auth_update" ON public.client_personas FOR UPDATE TO authenticated
        USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
      ';
      EXECUTE '
        CREATE POLICY "client_personas_auth_delete" ON public.client_personas FOR DELETE TO authenticated
        USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
      ';
    ELSE
      EXECUTE 'CREATE POLICY "client_personas_auth_all" ON public.client_personas FOR ALL TO authenticated USING (true) WITH CHECK (true)';
    END IF;
    
    EXECUTE 'CREATE POLICY "client_personas_anon_select" ON public.client_personas FOR SELECT TO anon USING (true)';
    EXECUTE 'CREATE POLICY "client_personas_service" ON public.client_personas FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
END $$;


-- client_platform_credentials
DO $$
DECLARE
  policy_name TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_platform_credentials' AND table_schema = 'public') THEN
    FOR policy_name IN 
      SELECT policyname FROM pg_policies WHERE tablename = 'client_platform_credentials' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.client_platform_credentials', policy_name);
    END LOOP;
    
    EXECUTE 'ALTER TABLE public.client_platform_credentials ENABLE ROW LEVEL SECURITY';
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_platform_credentials' AND column_name = 'tenant_id') THEN
      EXECUTE '
        CREATE POLICY "client_platform_credentials_auth_select" ON public.client_platform_credentials FOR SELECT TO authenticated
        USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id() OR public.is_platform_admin())
      ';
      EXECUTE '
        CREATE POLICY "client_platform_credentials_auth_insert" ON public.client_platform_credentials FOR INSERT TO authenticated
        WITH CHECK (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
      ';
      EXECUTE '
        CREATE POLICY "client_platform_credentials_auth_update" ON public.client_platform_credentials FOR UPDATE TO authenticated
        USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
      ';
      EXECUTE '
        CREATE POLICY "client_platform_credentials_auth_delete" ON public.client_platform_credentials FOR DELETE TO authenticated
        USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
      ';
    ELSE
      EXECUTE 'CREATE POLICY "client_platform_credentials_auth_all" ON public.client_platform_credentials FOR ALL TO authenticated USING (true) WITH CHECK (true)';
    END IF;
    
    EXECUTE 'CREATE POLICY "client_platform_credentials_anon_select" ON public.client_platform_credentials FOR SELECT TO anon USING (true)';
    EXECUTE 'CREATE POLICY "client_platform_credentials_anon_write" ON public.client_platform_credentials FOR INSERT TO anon WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "client_platform_credentials_anon_update" ON public.client_platform_credentials FOR UPDATE TO anon USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "client_platform_credentials_service" ON public.client_platform_credentials FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
END $$;


-- client_social_media
DO $$
DECLARE
  policy_name TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_social_media' AND table_schema = 'public') THEN
    FOR policy_name IN 
      SELECT policyname FROM pg_policies WHERE tablename = 'client_social_media' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.client_social_media', policy_name);
    END LOOP;
    
    EXECUTE 'ALTER TABLE public.client_social_media ENABLE ROW LEVEL SECURITY';
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_social_media' AND column_name = 'tenant_id') THEN
      EXECUTE '
        CREATE POLICY "client_social_media_auth_select" ON public.client_social_media FOR SELECT TO authenticated
        USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id() OR public.is_platform_admin())
      ';
      EXECUTE '
        CREATE POLICY "client_social_media_auth_insert" ON public.client_social_media FOR INSERT TO authenticated
        WITH CHECK (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
      ';
      EXECUTE '
        CREATE POLICY "client_social_media_auth_update" ON public.client_social_media FOR UPDATE TO authenticated
        USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
      ';
      EXECUTE '
        CREATE POLICY "client_social_media_auth_delete" ON public.client_social_media FOR DELETE TO authenticated
        USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
      ';
    ELSE
      EXECUTE 'CREATE POLICY "client_social_media_auth_all" ON public.client_social_media FOR ALL TO authenticated USING (true) WITH CHECK (true)';
    END IF;
    
    EXECUTE 'CREATE POLICY "client_social_media_anon_select" ON public.client_social_media FOR SELECT TO anon USING (true)';
    EXECUTE 'CREATE POLICY "client_social_media_anon_write" ON public.client_social_media FOR INSERT TO anon WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "client_social_media_anon_update" ON public.client_social_media FOR UPDATE TO anon USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "client_social_media_service" ON public.client_social_media FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
END $$;


-- ============================================================================
-- 6. FIX TENANT-RELATED TABLES
-- ============================================================================

-- tenant_capabilities (read-only for users, managed by platform)
DO $$
DECLARE
  policy_name TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_capabilities' AND table_schema = 'public') THEN
    FOR policy_name IN 
      SELECT policyname FROM pg_policies WHERE tablename = 'tenant_capabilities' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.tenant_capabilities', policy_name);
    END LOOP;
    
    EXECUTE 'ALTER TABLE public.tenant_capabilities ENABLE ROW LEVEL SECURITY';
    
    -- Everyone can read their tenant's capabilities
    EXECUTE '
      CREATE POLICY "tenant_capabilities_auth_select" ON public.tenant_capabilities FOR SELECT TO authenticated
      USING (tenant_id = public.get_user_tenant_id() OR public.is_platform_admin())
    ';
    
    -- Only platform admins can modify
    EXECUTE '
      CREATE POLICY "tenant_capabilities_admin_all" ON public.tenant_capabilities FOR ALL TO authenticated
      USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin())
    ';
    
    EXECUTE 'CREATE POLICY "tenant_capabilities_service" ON public.tenant_capabilities FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
END $$;


-- tenant_invites
DO $$
DECLARE
  policy_name TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_invites' AND table_schema = 'public') THEN
    FOR policy_name IN 
      SELECT policyname FROM pg_policies WHERE tablename = 'tenant_invites' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.tenant_invites', policy_name);
    END LOOP;
    
    EXECUTE 'ALTER TABLE public.tenant_invites ENABLE ROW LEVEL SECURITY';
    
    -- Authenticated users can view invites for their tenant
    EXECUTE '
      CREATE POLICY "tenant_invites_auth_select" ON public.tenant_invites FOR SELECT TO authenticated
      USING (tenant_id = public.get_user_tenant_id() OR public.is_platform_admin())
    ';
    
    -- Users with permission can create invites
    EXECUTE '
      CREATE POLICY "tenant_invites_auth_insert" ON public.tenant_invites FOR INSERT TO authenticated
      WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.has_permission(''team.invite_members''))
    ';
    
    -- Users with permission can update invites
    EXECUTE '
      CREATE POLICY "tenant_invites_auth_update" ON public.tenant_invites FOR UPDATE TO authenticated
      USING (tenant_id = public.get_user_tenant_id() AND public.has_permission(''team.invite_members''))
    ';
    
    -- Users with permission can delete invites
    EXECUTE '
      CREATE POLICY "tenant_invites_auth_delete" ON public.tenant_invites FOR DELETE TO authenticated
      USING (tenant_id = public.get_user_tenant_id() AND public.has_permission(''team.invite_members''))
    ';
    
    -- Anon can view invites by token (for accepting)
    EXECUTE 'CREATE POLICY "tenant_invites_anon_select" ON public.tenant_invites FOR SELECT TO anon USING (true)';
    
    EXECUTE 'CREATE POLICY "tenant_invites_service" ON public.tenant_invites FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
END $$;


-- platform_interests
DO $$
DECLARE
  policy_name TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'platform_interests' AND table_schema = 'public') THEN
    FOR policy_name IN 
      SELECT policyname FROM pg_policies WHERE tablename = 'platform_interests' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.platform_interests', policy_name);
    END LOOP;
    
    EXECUTE 'ALTER TABLE public.platform_interests ENABLE ROW LEVEL SECURITY';
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_interests' AND column_name = 'tenant_id') THEN
      EXECUTE '
        CREATE POLICY "platform_interests_auth_select" ON public.platform_interests FOR SELECT TO authenticated
        USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id() OR public.is_platform_admin())
      ';
      EXECUTE '
        CREATE POLICY "platform_interests_auth_insert" ON public.platform_interests FOR INSERT TO authenticated
        WITH CHECK (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
      ';
      EXECUTE '
        CREATE POLICY "platform_interests_auth_update" ON public.platform_interests FOR UPDATE TO authenticated
        USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
      ';
      EXECUTE '
        CREATE POLICY "platform_interests_auth_delete" ON public.platform_interests FOR DELETE TO authenticated
        USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
      ';
    ELSE
      EXECUTE 'CREATE POLICY "platform_interests_auth_all" ON public.platform_interests FOR ALL TO authenticated USING (true) WITH CHECK (true)';
    END IF;
    
    EXECUTE 'CREATE POLICY "platform_interests_anon_select" ON public.platform_interests FOR SELECT TO anon USING (true)';
    EXECUTE 'CREATE POLICY "platform_interests_anon_write" ON public.platform_interests FOR INSERT TO anon WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "platform_interests_service" ON public.platform_interests FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
END $$;


-- ============================================================================
-- 7. ADD MISSING TRIGGERS FOR TENANT_ID AUTO-FILL
-- ============================================================================

DO $$
BEGIN
  -- messages
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'tenant_id') THEN
    DROP TRIGGER IF EXISTS auto_tenant_id_messages ON public.messages;
    CREATE TRIGGER auto_tenant_id_messages BEFORE INSERT ON public.messages
      FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();
  END IF;
  
  -- threads
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'threads') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'threads' AND column_name = 'tenant_id') THEN
    DROP TRIGGER IF EXISTS auto_tenant_id_threads ON public.threads;
    CREATE TRIGGER auto_tenant_id_threads BEFORE INSERT ON public.threads
      FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();
  END IF;
  
  -- client_personas
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_personas') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_personas' AND column_name = 'tenant_id') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_personas' AND column_name = 'client_id') THEN
    DROP TRIGGER IF EXISTS auto_tenant_id_client_personas ON public.client_personas;
    CREATE TRIGGER auto_tenant_id_client_personas BEFORE INSERT ON public.client_personas
      FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id_from_client();
  END IF;
  
  -- client_social_media
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_social_media') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_social_media' AND column_name = 'tenant_id') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_social_media' AND column_name = 'client_id') THEN
    DROP TRIGGER IF EXISTS auto_tenant_id_client_social_media ON public.client_social_media;
    CREATE TRIGGER auto_tenant_id_client_social_media BEFORE INSERT ON public.client_social_media
      FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id_from_client();
  END IF;
  
  -- client_platform_credentials
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_platform_credentials') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_platform_credentials' AND column_name = 'tenant_id') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_platform_credentials' AND column_name = 'client_id') THEN
    DROP TRIGGER IF EXISTS auto_tenant_id_client_platform_credentials ON public.client_platform_credentials;
    CREATE TRIGGER auto_tenant_id_client_platform_credentials BEFORE INSERT ON public.client_platform_credentials
      FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id_from_client();
  END IF;
  
  -- platform_interests
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'platform_interests') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_interests' AND column_name = 'tenant_id') THEN
    DROP TRIGGER IF EXISTS auto_tenant_id_platform_interests ON public.platform_interests;
    CREATE TRIGGER auto_tenant_id_platform_interests BEFORE INSERT ON public.platform_interests
      FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();
  END IF;
END $$;


-- ============================================================================
-- 8. ADD team.invite_members PERMISSION IF MISSING
-- ============================================================================

INSERT INTO public.permissions_catalog (code, name, description, category, type, display_order, is_active)
VALUES ('team.invite_members', 'Invite Team Members', 'Send invites to join the team', 'team', 'action', 9, true)
ON CONFLICT (code) DO NOTHING;


-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

