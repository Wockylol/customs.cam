-- Update storage policies to allow unauthenticated client access
-- This migration drops old authenticated-only policies and creates new public policies

-- ============================================================================
-- Drop old authenticated-only policies for scene-content bucket
-- ============================================================================

DROP POLICY IF EXISTS "Clients can upload their scene content" ON storage.objects;
DROP POLICY IF EXISTS "Clients can delete their scene content" ON storage.objects;
DROP POLICY IF EXISTS "Clients can update their scene content" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete any scene content" ON storage.objects;

-- ============================================================================
-- Create new public policies for scene-content bucket
-- ============================================================================

-- Allow ANYONE (including unauthenticated clients) to upload scene content
-- Note: Application layer validates client_id from assignment before uploading
CREATE POLICY "Anyone can upload scene content"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'scene-content');

-- Allow ANYONE to view scene content (for unauthenticated client mobile view)
-- This allows clients to view their uploaded content and admins to review submissions
-- Note: This policy may already exist from previous migration, ignore if conflict
DO $$ 
BEGIN
    CREATE POLICY "Anyone can view scene content"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'scene-content');
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Policy already exists, ignore
END $$;

-- Allow ANYONE to delete scene content
-- Note: Application layer ensures users only delete their own content
CREATE POLICY "Anyone can delete scene content"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'scene-content');

-- Allow ANYONE to update scene content
-- Note: Application layer ensures users only update their own content
CREATE POLICY "Anyone can update scene content"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'scene-content');

