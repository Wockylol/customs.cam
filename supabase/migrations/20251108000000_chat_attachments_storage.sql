/*
  # Create storage bucket for chat attachments

  1. Storage Setup
    - Create 'chat-attachments' bucket for image uploads in group chats
    - Enable public access for uploaded images
    - Set 50MB file size limit per image
    - Restrict to image types only

  2. Security
    - Allow authenticated team members to upload images
    - Allow public read access to uploaded images
    - Allow authenticated users to delete images
*/

-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments', 
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Allow authenticated team members to upload images
CREATE POLICY "Team members can upload chat attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments' AND
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.id = auth.uid() AND team_members.is_active = true
    )
  );

-- Allow public read access to uploaded images
CREATE POLICY "Anyone can view chat attachments" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'chat-attachments');

-- Allow authenticated users to delete chat attachments
CREATE POLICY "Team members can delete chat attachments" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-attachments' AND
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.id = auth.uid() AND team_members.is_active = true
    )
  );

