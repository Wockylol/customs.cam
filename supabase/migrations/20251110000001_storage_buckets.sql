-- Create storage buckets for content scenes
-- Note: This should be run AFTER creating the buckets in the UI or via the management API

-- Insert storage buckets (if not already created via UI)
-- Note: Buckets are set to public=true so getPublicUrl() works
-- Access control is managed via RLS policies below
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('scene-examples', 'scene-examples', true, 52428800, ARRAY['image/*', 'video/*']),
  ('scene-content', 'scene-content', true, 52428800, ARRAY['image/*', 'video/*'])
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Storage Policies for scene-examples bucket
-- ============================================================================

-- Allow admins/managers to upload examples
CREATE POLICY "Admins can upload examples"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'scene-examples' 
  AND EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.id = auth.uid()
    AND team_members.role IN ('admin', 'manager')
    AND team_members.is_active = true
  )
);

-- Allow ANYONE (including unauthenticated clients) to view examples
CREATE POLICY "Anyone can view examples"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'scene-examples');

-- Allow admins/managers to delete examples
CREATE POLICY "Admins can delete examples"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'scene-examples'
  AND EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.id = auth.uid()
    AND team_members.role IN ('admin', 'manager')
    AND team_members.is_active = true
  )
);

-- Allow admins/managers to update examples
CREATE POLICY "Admins can update examples"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'scene-examples'
  AND EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.id = auth.uid()
    AND team_members.role IN ('admin', 'manager')
    AND team_members.is_active = true
  )
);

-- ============================================================================
-- Storage Policies for scene-content bucket
-- ============================================================================

-- Allow authenticated clients to upload to their own folders
-- Note: Clients uploading content should be authenticated (via client_id)
CREATE POLICY "Clients can upload their scene content"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'scene-content'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow ANYONE to view scene content (for unauthenticated client mobile view)
-- This allows clients to view their uploaded content and admins to review submissions
CREATE POLICY "Anyone can view scene content"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'scene-content');

-- Allow clients to delete their own uploads
CREATE POLICY "Clients can delete their scene content"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'scene-content'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow clients to update their own uploads
CREATE POLICY "Clients can update their scene content"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'scene-content'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow admins to delete any scene content
CREATE POLICY "Admins can delete any scene content"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'scene-content'
  AND EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.id = auth.uid()
    AND team_members.role IN ('admin', 'manager')
    AND team_members.is_active = true
  )
);

