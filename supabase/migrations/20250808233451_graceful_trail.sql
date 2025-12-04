/*
  # Fix team_members RLS policies for user registration

  1. Security Changes
    - Drop existing problematic policies
    - Create simple INSERT policy for authenticated users
    - Create simple SELECT/UPDATE policies for own records
    - Add service role policy for admin operations

  2. Key Changes
    - Allow authenticated users to insert their own team_member record
    - Use direct auth.uid() = id pattern (no recursion)
    - Remove complex policy logic that was causing violations
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can read own team member data" ON team_members;
DROP POLICY IF EXISTS "Users can update own team member data" ON team_members;
DROP POLICY IF EXISTS "Service role can manage team members" ON team_members;
DROP POLICY IF EXISTS "Team members can manage clients" ON team_members;

-- Enable RLS (should already be enabled, but ensure it)
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own team member record
CREATE POLICY "Allow authenticated users to insert own team member record"
  ON team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to read their own team member data
CREATE POLICY "Allow users to read own team member data"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to update their own team member data
CREATE POLICY "Allow users to update own team member data"
  ON team_members
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow service role to manage all team members (for admin operations)
CREATE POLICY "Allow service role to manage team members"
  ON team_members
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);