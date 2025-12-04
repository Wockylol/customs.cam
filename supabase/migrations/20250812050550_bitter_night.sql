/*
  # Create media storage bucket with proper RLS policies

  1. Storage Setup
    - Create `media` bucket if it doesn't exist
    - Set bucket to public for easy access to avatars
    - Configure proper file size and type restrictions

  2. Security Policies
    - Allow authenticated team members to upload to avatars folder
    - Allow public read access to avatar images
    - Allow team members to update/delete their uploaded avatars
    - Restrict uploads to image files only

  3. Path Structure
    - avatars/{client-id}-{timestamp}.{extension}
    - Organized by client ID for easy management
*/

-- Create the media bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- Policy for uploading avatars (team members only)
CREATE POLICY "Team members can upload avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media' 
  AND (storage.foldername(name))[1] = 'avatars'
  AND EXISTS (
    SELECT 1 FROM team_members tm 
    WHERE tm.id = auth.uid() AND tm.is_active = true
  )
);

-- Policy for reading avatars (public access)
CREATE POLICY "Anyone can view avatars"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'media' 
  AND (storage.foldername(name))[1] = 'avatars'
);

-- Policy for updating avatars (team members only)
CREATE POLICY "Team members can update avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'media' 
  AND (storage.foldername(name))[1] = 'avatars'
  AND EXISTS (
    SELECT 1 FROM team_members tm 
    WHERE tm.id = auth.uid() AND tm.is_active = true
  )
)
WITH CHECK (
  bucket_id = 'media' 
  AND (storage.foldername(name))[1] = 'avatars'
  AND EXISTS (
    SELECT 1 FROM team_members tm 
    WHERE tm.id = auth.uid() AND tm.is_active = true
  )
);

-- Policy for deleting avatars (team members only)
CREATE POLICY "Team members can delete avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'media' 
  AND (storage.foldername(name))[1] = 'avatars'
  AND EXISTS (
    SELECT 1 FROM team_members tm 
    WHERE tm.id = auth.uid() AND tm.is_active = true
  )
);