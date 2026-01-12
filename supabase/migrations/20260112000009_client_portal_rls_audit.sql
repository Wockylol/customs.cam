-- ============================================================================
-- CLIENT PORTAL RLS AUDIT - Ensure all client-facing tables work for anon users
-- ============================================================================
-- This migration audits and fixes RLS for all tables used by the client mobile view:
-- 
-- CLIENT ACTIONS:
-- 1. View their custom requests
-- 2. Approve custom requests (update status)
-- 3. Mark customs as complete (update status)
-- 4. View/upload content for scenes
-- 5. Fill out questionnaire forms
-- 6. Update preferences
-- 7. Update personal info
-- 8. Set/verify PIN
-- 9. View notifications
-- ============================================================================

-- ============================================================================
-- TABLES CLIENTS NEED TO READ (anon SELECT)
-- ============================================================================
-- clients, custom_requests, content_scenes, client_scene_assignments,
-- client_questionnaire, client_preferences, client_personal_info,
-- client_platforms, client_notes, client_content_details, client_personas,
-- client_platform_credentials, client_social_media, scene_content_uploads,
-- scene_example_media, platforms

-- ============================================================================
-- TABLES CLIENTS NEED TO WRITE (anon INSERT/UPDATE)
-- ============================================================================
-- client_pins, client_questionnaire, client_preferences, client_personal_info,
-- client_content_details, client_personas, client_platform_credentials, 
-- client_social_media, scene_content_uploads, custom_requests (status update),
-- client_scene_assignments (status update)


-- ============================================================================
-- 1. ENSURE ANON SELECT ACCESS FOR READ-ONLY TABLES
-- ============================================================================

-- Helper to add anon select if missing
CREATE OR REPLACE FUNCTION ensure_anon_select(p_table_name TEXT)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = p_table_name 
    AND schemaname = 'public' 
    AND roles::text LIKE '%anon%'
    AND cmd = 'SELECT'
  ) THEN
    EXECUTE format('
      CREATE POLICY "%s_anon_select" ON public.%I FOR SELECT TO anon USING (true)
    ', p_table_name, p_table_name);
    RAISE NOTICE 'Added anon SELECT policy to %', p_table_name;
  ELSE
    RAISE NOTICE 'Anon SELECT already exists for %', p_table_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply to all client-readable tables
DO $$
DECLARE
  tables_to_check TEXT[] := ARRAY[
    'clients',
    'custom_requests', 
    'content_scenes',
    'client_scene_assignments',
    'client_questionnaire',
    'client_preferences',
    'client_personal_info',
    'client_platforms',
    'client_notes',
    'client_note_replies',
    'client_content_details',
    'client_personas',
    'client_platform_credentials',
    'client_social_media',
    'scene_content_uploads',
    'scene_example_media',
    'platforms',
    'content_uploads',
    'client_pins',
    'client_idiolect_analysis',
    'fan_notes',
    'fan_note_replies'
  ];
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY tables_to_check LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl AND table_schema = 'public') THEN
      PERFORM ensure_anon_select(tbl);
    ELSE
      RAISE NOTICE 'Table % does not exist, skipping', tbl;
    END IF;
  END LOOP;
END $$;


-- ============================================================================
-- 2. ENSURE ANON WRITE ACCESS FOR FORM TABLES
-- ============================================================================

-- Helper to add anon insert/update if missing
CREATE OR REPLACE FUNCTION ensure_anon_write(p_table_name TEXT)
RETURNS VOID AS $$
BEGIN
  -- Check/add INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = p_table_name 
    AND schemaname = 'public' 
    AND roles::text LIKE '%anon%'
    AND cmd = 'INSERT'
  ) THEN
    EXECUTE format('
      CREATE POLICY "%s_anon_insert" ON public.%I FOR INSERT TO anon WITH CHECK (true)
    ', p_table_name, p_table_name);
    RAISE NOTICE 'Added anon INSERT policy to %', p_table_name;
  END IF;
  
  -- Check/add UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = p_table_name 
    AND schemaname = 'public' 
    AND roles::text LIKE '%anon%'
    AND cmd = 'UPDATE'
  ) THEN
    EXECUTE format('
      CREATE POLICY "%s_anon_update" ON public.%I FOR UPDATE TO anon USING (true) WITH CHECK (true)
    ', p_table_name, p_table_name);
    RAISE NOTICE 'Added anon UPDATE policy to %', p_table_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply to all client-writable tables
DO $$
DECLARE
  tables_to_check TEXT[] := ARRAY[
    'client_pins',
    'client_questionnaire',
    'client_preferences',
    'client_personal_info',
    'client_content_details',
    'client_personas',
    'client_platform_credentials',
    'client_social_media',
    'scene_content_uploads',
    'custom_requests',
    'client_scene_assignments',
    'clients',
    'content_uploads'
  ];
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY tables_to_check LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl AND table_schema = 'public') THEN
      PERFORM ensure_anon_write(tbl);
    ELSE
      RAISE NOTICE 'Table % does not exist, skipping', tbl;
    END IF;
  END LOOP;
END $$;


-- ============================================================================
-- 3. ADD TENANT_ID AUTO-FILL TRIGGERS FOR CLIENT TABLES
-- ============================================================================

-- Ensure the function exists
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

GRANT EXECUTE ON FUNCTION public.auto_set_tenant_id_from_client() TO anon;
GRANT EXECUTE ON FUNCTION public.auto_set_tenant_id_from_client() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_set_tenant_id_from_client() TO service_role;

-- Apply triggers to client-related tables
DO $$
DECLARE
  client_tables TEXT[] := ARRAY[
    'client_questionnaire',
    'client_preferences', 
    'client_personal_info',
    'client_content_details',
    'client_personas',
    'client_platform_credentials',
    'client_social_media',
    'client_pins',
    'client_platforms',
    'client_notes',
    'client_note_replies',
    'client_idiolect_analysis',
    'client_scene_assignments'
  ];
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY client_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl AND table_schema = 'public') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl AND column_name = 'tenant_id' AND table_schema = 'public')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl AND column_name = 'client_id' AND table_schema = 'public') THEN
      EXECUTE format('DROP TRIGGER IF EXISTS auto_tenant_from_client_%s ON public.%I', tbl, tbl);
      EXECUTE format('
        CREATE TRIGGER auto_tenant_from_client_%s BEFORE INSERT ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id_from_client()
      ', tbl, tbl);
      RAISE NOTICE 'Added tenant_id auto-fill trigger to %', tbl;
    END IF;
  END LOOP;
END $$;


-- ============================================================================
-- 4. FIX SCENE_CONTENT_UPLOADS SPECIFICALLY (critical for content upload)
-- ============================================================================

DO $$
DECLARE
  policy_name TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scene_content_uploads') THEN
    -- Drop all existing policies
    FOR policy_name IN 
      SELECT policyname FROM pg_policies WHERE tablename = 'scene_content_uploads' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.scene_content_uploads', policy_name);
    END LOOP;
    
    -- Create comprehensive policies
    EXECUTE 'ALTER TABLE public.scene_content_uploads ENABLE ROW LEVEL SECURITY';
    
    -- Anon full access (clients uploading content)
    EXECUTE 'CREATE POLICY "scene_content_uploads_anon_select" ON public.scene_content_uploads FOR SELECT TO anon USING (true)';
    EXECUTE 'CREATE POLICY "scene_content_uploads_anon_insert" ON public.scene_content_uploads FOR INSERT TO anon WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "scene_content_uploads_anon_update" ON public.scene_content_uploads FOR UPDATE TO anon USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "scene_content_uploads_anon_delete" ON public.scene_content_uploads FOR DELETE TO anon USING (true)';
    
    -- Authenticated access
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scene_content_uploads' AND column_name = 'tenant_id') THEN
      EXECUTE '
        CREATE POLICY "scene_content_uploads_auth_select" ON public.scene_content_uploads FOR SELECT TO authenticated
        USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id() OR public.is_platform_admin())
      ';
      EXECUTE '
        CREATE POLICY "scene_content_uploads_auth_insert" ON public.scene_content_uploads FOR INSERT TO authenticated
        WITH CHECK (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
      ';
      EXECUTE '
        CREATE POLICY "scene_content_uploads_auth_update" ON public.scene_content_uploads FOR UPDATE TO authenticated
        USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
      ';
      EXECUTE '
        CREATE POLICY "scene_content_uploads_auth_delete" ON public.scene_content_uploads FOR DELETE TO authenticated
        USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
      ';
    ELSE
      EXECUTE 'CREATE POLICY "scene_content_uploads_auth_all" ON public.scene_content_uploads FOR ALL TO authenticated USING (true) WITH CHECK (true)';
    END IF;
    
    -- Service role
    EXECUTE 'CREATE POLICY "scene_content_uploads_service" ON public.scene_content_uploads FOR ALL TO service_role USING (true) WITH CHECK (true)';
    
    RAISE NOTICE 'Fixed scene_content_uploads RLS policies';
  END IF;
END $$;


-- ============================================================================
-- 5. FIX CONTENT_UPLOADS SPECIFICALLY (for custom request uploads)
-- ============================================================================

DO $$
DECLARE
  policy_name TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_uploads') THEN
    -- Drop all existing policies
    FOR policy_name IN 
      SELECT policyname FROM pg_policies WHERE tablename = 'content_uploads' AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.content_uploads', policy_name);
    END LOOP;
    
    -- Create comprehensive policies
    EXECUTE 'ALTER TABLE public.content_uploads ENABLE ROW LEVEL SECURITY';
    
    -- Anon full access (clients uploading content)
    EXECUTE 'CREATE POLICY "content_uploads_anon_select" ON public.content_uploads FOR SELECT TO anon USING (true)';
    EXECUTE 'CREATE POLICY "content_uploads_anon_insert" ON public.content_uploads FOR INSERT TO anon WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "content_uploads_anon_update" ON public.content_uploads FOR UPDATE TO anon USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "content_uploads_anon_delete" ON public.content_uploads FOR DELETE TO anon USING (true)';
    
    -- Authenticated access
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_uploads' AND column_name = 'tenant_id') THEN
      EXECUTE '
        CREATE POLICY "content_uploads_auth_select" ON public.content_uploads FOR SELECT TO authenticated
        USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id() OR public.is_platform_admin())
      ';
      EXECUTE '
        CREATE POLICY "content_uploads_auth_insert" ON public.content_uploads FOR INSERT TO authenticated
        WITH CHECK (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
      ';
      EXECUTE '
        CREATE POLICY "content_uploads_auth_update" ON public.content_uploads FOR UPDATE TO authenticated
        USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
      ';
      EXECUTE '
        CREATE POLICY "content_uploads_auth_delete" ON public.content_uploads FOR DELETE TO authenticated
        USING (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
      ';
    ELSE
      EXECUTE 'CREATE POLICY "content_uploads_auth_all" ON public.content_uploads FOR ALL TO authenticated USING (true) WITH CHECK (true)';
    END IF;
    
    -- Service role
    EXECUTE 'CREATE POLICY "content_uploads_service" ON public.content_uploads FOR ALL TO service_role USING (true) WITH CHECK (true)';
    
    RAISE NOTICE 'Fixed content_uploads RLS policies';
  END IF;
END $$;


-- ============================================================================
-- 6. VERIFY CUSTOM_REQUESTS UPDATE FOR STATUS CHANGES
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'custom_requests') THEN
    -- Ensure anon can update (for approving/completing)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'custom_requests' 
      AND schemaname = 'public' 
      AND roles::text LIKE '%anon%'
      AND cmd = 'UPDATE'
    ) THEN
      EXECUTE 'CREATE POLICY "custom_requests_anon_update" ON public.custom_requests FOR UPDATE TO anon USING (true) WITH CHECK (true)';
      RAISE NOTICE 'Added anon UPDATE policy to custom_requests';
    END IF;
  END IF;
END $$;


-- ============================================================================
-- 7. VERIFY CLIENT_SCENE_ASSIGNMENTS UPDATE FOR STATUS CHANGES
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_scene_assignments') THEN
    -- Ensure anon can update (for marking complete)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'client_scene_assignments' 
      AND schemaname = 'public' 
      AND roles::text LIKE '%anon%'
      AND cmd = 'UPDATE'
    ) THEN
      EXECUTE 'CREATE POLICY "client_scene_assignments_anon_update" ON public.client_scene_assignments FOR UPDATE TO anon USING (true) WITH CHECK (true)';
      RAISE NOTICE 'Added anon UPDATE policy to client_scene_assignments';
    END IF;
  END IF;
END $$;


-- ============================================================================
-- 8. CLEANUP HELPER FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS ensure_anon_select(TEXT);
DROP FUNCTION IF EXISTS ensure_anon_write(TEXT);


-- ============================================================================
-- 9. VERIFICATION QUERY (run separately)
-- ============================================================================

/*
-- Check all anon policies:
SELECT 
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE schemaname = 'public'
AND roles::text LIKE '%anon%'
ORDER BY tablename, cmd;

-- Check client portal tables specifically:
SELECT 
  tablename,
  COUNT(*) FILTER (WHERE roles::text LIKE '%anon%' AND cmd = 'SELECT') as anon_select,
  COUNT(*) FILTER (WHERE roles::text LIKE '%anon%' AND cmd = 'INSERT') as anon_insert,
  COUNT(*) FILTER (WHERE roles::text LIKE '%anon%' AND cmd = 'UPDATE') as anon_update,
  COUNT(*) as total_policies
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN (
  'clients', 'custom_requests', 'client_pins', 'client_questionnaire',
  'client_preferences', 'client_personal_info', 'client_content_details',
  'client_personas', 'client_platform_credentials', 'client_social_media',
  'content_uploads', 'scene_content_uploads', 'client_scene_assignments',
  'content_scenes'
)
GROUP BY tablename
ORDER BY tablename;
*/


-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

