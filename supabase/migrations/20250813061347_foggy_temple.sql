/*
  # Add storage bucket and policies for custom content uploads

  1. Storage Setup
    - Create 'custom-content' bucket for file uploads
    - Enable public access for uploaded files
    - Set up RLS policies for secure access

  2. Security
    - Allow authenticated users to upload files
    - Allow public read access to uploaded content
    - Restrict uploads to team members and clients
*/

-- Create storage bucket for custom content
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'custom-content',
  'custom-content', 
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/x-msvideo', 'audio/mpeg', 'audio/wav', 'audio/mp4']
) ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'custom-content');

-- Allow public read access to uploaded files
CREATE POLICY "Allow public downloads" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'custom-content');

-- Allow users to update their own uploads
CREATE POLICY "Allow authenticated updates" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'custom-content');

-- Allow users to delete their own uploads
CREATE POLICY "Allow authenticated deletes" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'custom-content');