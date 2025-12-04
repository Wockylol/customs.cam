-- Create storage bucket for sales screenshots
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sales-screenshots',
  'sales-screenshots', 
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Allow authenticated chatters to upload their sales screenshots
CREATE POLICY "Chatters can upload sales screenshots" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'sales-screenshots' AND
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.id = auth.uid() 
      AND team_members.role = 'chatter'
      AND team_members.is_active = true
    )
  );

-- Allow authenticated team members to view sales screenshots
CREATE POLICY "Team members can view sales screenshots" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'sales-screenshots' AND
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.id = auth.uid() AND team_members.is_active = true
    )
  );

-- Allow chatters to delete their own sales screenshots
CREATE POLICY "Chatters can delete their own sales screenshots" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'sales-screenshots' AND
    (storage.foldername(name))[1] = auth.uid()::text AND
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.id = auth.uid() 
      AND team_members.role = 'chatter'
      AND team_members.is_active = true
    )
  );

-- Allow managers/admins to delete any sales screenshots
CREATE POLICY "Managers can delete any sales screenshots" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'sales-screenshots' AND
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.id = auth.uid() 
      AND team_members.role IN ('manager', 'admin')
      AND team_members.is_active = true
    )
  );

