/*
  # Fix content uploads RLS policy for anonymous users

  1. Security Updates
    - Enable RLS on content_uploads table
    - Add policy for anonymous users to insert uploads for valid custom requests
    - Ensure uploads can only be made for existing custom requests

  2. Changes
    - Allow anon role to insert content uploads
    - Validate custom_request_id exists before allowing upload
    - Maintain data integrity with foreign key validation
*/

-- Enable RLS on content_uploads table if not already enabled
ALTER TABLE content_uploads ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies that might be blocking anon users
DROP POLICY IF EXISTS "Team members can manage content uploads" ON content_uploads;
DROP POLICY IF EXISTS "Team members can read all content uploads" ON content_uploads;

-- Create policy to allow anonymous users to upload content for valid custom requests
CREATE POLICY "Allow anon to upload content for valid requests"
  ON content_uploads
  FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM custom_requests 
      WHERE custom_requests.id = custom_request_id
    )
  );

-- Create policy to allow team members to read all content uploads
CREATE POLICY "Team members can read all content uploads"
  ON content_uploads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM team_members tm
      WHERE tm.id = auth.uid() AND tm.is_active = true
    )
  );

-- Create policy to allow team members to manage content uploads
CREATE POLICY "Team members can manage content uploads"
  ON content_uploads
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM team_members tm
      WHERE tm.id = auth.uid() AND tm.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM team_members tm
      WHERE tm.id = auth.uid() AND tm.is_active = true
    )
  );