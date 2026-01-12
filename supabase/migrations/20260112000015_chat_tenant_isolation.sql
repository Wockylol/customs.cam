-- ============================================================================
-- CHAT TENANT ISOLATION VIA MASTER PHONE
-- ============================================================================
-- This migration implements multi-tenant chat isolation:
-- 1. Adds master_phone column to tenant_agencies
-- 2. Adds tenant_id column to threads table
-- 3. Creates a trigger to auto-assign tenant_id based on master_phone match
-- 4. Backfills existing threads
-- ============================================================================

-- ============================================================================
-- 1. ADD MASTER_PHONE TO TENANT_AGENCIES
-- ============================================================================

ALTER TABLE public.tenant_agencies 
  ADD COLUMN IF NOT EXISTS master_phone TEXT;

CREATE INDEX IF NOT EXISTS idx_tenant_agencies_master_phone 
  ON public.tenant_agencies(master_phone) 
  WHERE master_phone IS NOT NULL;

COMMENT ON COLUMN public.tenant_agencies.master_phone IS 
  'The designated phone number that must be in a group chat to associate it with this tenant. Used for Loopmessage/iMessage chat tenant isolation.';

-- ============================================================================
-- 2. ADD TENANT_ID TO THREADS TABLE
-- ============================================================================

ALTER TABLE public.threads 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenant_agencies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_threads_tenant_id 
  ON public.threads(tenant_id);

CREATE INDEX IF NOT EXISTS idx_threads_tenant_updated 
  ON public.threads(tenant_id, updated_at DESC);

COMMENT ON COLUMN public.threads.tenant_id IS 
  'The tenant agency this chat thread belongs to. Auto-assigned based on master_phone participant matching.';

-- ============================================================================
-- 3. PHONE NORMALIZATION HELPER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.normalize_phone_last10(phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Strip all non-digit characters and return last 10 digits
  RETURN RIGHT(REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]', '', 'g'), 10);
END;
$$;

COMMENT ON FUNCTION public.normalize_phone_last10(TEXT) IS 
  'Normalizes a phone number to its last 10 digits for comparison. Handles +1, 1, and raw formats.';

-- ============================================================================
-- 4. TRIGGER FUNCTION TO AUTO-ASSIGN TENANT_ID
-- ============================================================================

CREATE OR REPLACE FUNCTION public.assign_thread_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_participant TEXT;
  v_participant_normalized TEXT;
  v_tenant_id UUID;
BEGIN
  -- Skip if tenant_id is already set
  IF NEW.tenant_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Check each participant against tenant master phones
  IF NEW.participants IS NOT NULL AND array_length(NEW.participants, 1) > 0 THEN
    FOREACH v_participant IN ARRAY NEW.participants
    LOOP
      v_participant_normalized := public.normalize_phone_last10(v_participant);
      
      -- Skip if normalized phone is empty or too short
      IF length(v_participant_normalized) < 10 THEN
        CONTINUE;
      END IF;
      
      -- Look for a tenant with matching master_phone
      SELECT id INTO v_tenant_id
      FROM public.tenant_agencies
      WHERE public.normalize_phone_last10(master_phone) = v_participant_normalized
        AND is_active = true
      LIMIT 1;
      
      -- If we found a match, assign and exit
      IF v_tenant_id IS NOT NULL THEN
        NEW.tenant_id := v_tenant_id;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.assign_thread_tenant_id() IS 
  'Trigger function that auto-assigns tenant_id to threads based on matching participants to tenant master_phone numbers.';

-- ============================================================================
-- 5. CREATE THE TRIGGER
-- ============================================================================

DROP TRIGGER IF EXISTS trg_assign_thread_tenant_id ON public.threads;

CREATE TRIGGER trg_assign_thread_tenant_id
  BEFORE INSERT OR UPDATE OF participants ON public.threads
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_thread_tenant_id();

-- ============================================================================
-- 6. SET FIRST-PARTY TENANT MASTER PHONE
-- ============================================================================

UPDATE public.tenant_agencies
SET master_phone = '+15615237997'
WHERE id = 'a0000000-0000-0000-0000-000000000001'::uuid;

-- ============================================================================
-- 7. BACKFILL EXISTING THREADS
-- ============================================================================

-- Backfill tenant_id for all existing threads based on master_phone matching
UPDATE public.threads t
SET tenant_id = ta.id
FROM public.tenant_agencies ta
WHERE t.tenant_id IS NULL
  AND ta.master_phone IS NOT NULL
  AND ta.is_active = true
  AND EXISTS (
    SELECT 1 
    FROM unnest(t.participants) AS p(phone)
    WHERE public.normalize_phone_last10(p.phone) = public.normalize_phone_last10(ta.master_phone)
  );

-- Log how many threads were backfilled
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.threads WHERE tenant_id IS NOT NULL;
  RAISE NOTICE 'Backfilled tenant_id for % threads', v_count;
END;
$$;

-- ============================================================================
-- 8. UPDATE RPC FUNCTION TO SUPPORT TENANT FILTERING
-- ============================================================================

-- Create a new version of the RPC that accepts optional tenant_id
CREATE OR REPLACE FUNCTION get_threads_with_latest_messages(p_tenant_id UUID DEFAULT NULL)
RETURNS TABLE (
  thread_id BIGINT,
  group_id TEXT,
  thread_name TEXT,
  client_id TEXT,
  participants TEXT[],
  thread_created_at TIMESTAMPTZ,
  thread_updated_at TIMESTAMPTZ,
  last_read_at TIMESTAMPTZ,
  latest_message_text TEXT,
  latest_message_speech_text TEXT,
  latest_message_created_at TIMESTAMPTZ,
  latest_message_sender_name TEXT,
  latest_message_sender_phone TEXT
) 
LANGUAGE SQL
STABLE
AS $$
  SELECT 
    t.id as thread_id,
    t.group_id,
    t.name as thread_name,
    t.client_id,
    t.participants,
    t.created_at as thread_created_at,
    t.updated_at as thread_updated_at,
    t.last_read_at,
    m.text as latest_message_text,
    m.speech_text as latest_message_speech_text,
    m.created_at as latest_message_created_at,
    m.sender_name as latest_message_sender_name,
    m.sender_phone_number as latest_message_sender_phone
  FROM threads t
  LEFT JOIN LATERAL (
    SELECT 
      text, 
      speech_text, 
      created_at, 
      sender_name, 
      sender_phone_number
    FROM messages 
    WHERE thread_id = t.id 
    ORDER BY created_at DESC 
    LIMIT 1
  ) m ON true
  WHERE 
    -- If tenant_id is provided, filter by it; otherwise return all (for backward compatibility)
    (p_tenant_id IS NULL OR t.tenant_id = p_tenant_id)
  ORDER BY 
    COALESCE(m.created_at, t.updated_at) DESC;
$$;

COMMENT ON FUNCTION get_threads_with_latest_messages(UUID) IS 
  'Fetches threads with their latest messages, optionally filtered by tenant_id.';

-- ============================================================================
-- 9. UPDATE RLS POLICY FOR THREADS (if RLS is enabled)
-- ============================================================================

-- Check if RLS is enabled on threads and add tenant-aware policy
DO $$
BEGIN
  -- Only proceed if RLS is enabled on threads
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'threads' 
    AND schemaname = 'public'
    AND rowsecurity = true
  ) THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "threads_tenant_isolation" ON public.threads;
    
    -- Create tenant isolation policy
    CREATE POLICY "threads_tenant_isolation" ON public.threads
      FOR ALL
      USING (
        -- Platform admins can see all threads
        EXISTS (
          SELECT 1 FROM public.platform_admins pa
          WHERE pa.user_id = auth.uid() AND pa.is_active = true
        )
        OR
        -- Tenant members can see their tenant's threads
        tenant_id IN (
          SELECT tenant_id FROM public.team_members
          WHERE user_id = auth.uid() AND is_active = true
        )
        OR
        -- Threads without tenant_id are visible to all authenticated users (legacy/unassigned)
        tenant_id IS NULL
      );
      
    RAISE NOTICE 'Created RLS policy threads_tenant_isolation';
  END IF;
END;
$$;

