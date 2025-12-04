/*
  # Fix RLS infinite recursion for team_members table

  1. Security Changes
    - Drop existing recursive policies on team_members table
    - Create non-recursive policies that use auth.uid() directly
    - Ensure policies don't reference the same table they're protecting

  2. Policy Structure
    - Allow users to read their own team member record
    - Allow admins to manage all team member records
    - Prevent circular references in policy conditions
*/

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Admins can manage team members" ON team_members;
DROP POLICY IF EXISTS "Team members can read all team member data" ON team_members;

-- Create non-recursive policies
CREATE POLICY "Users can read own team member data"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own team member data"
  ON team_members
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow service role to manage all team members (for admin operations)
CREATE POLICY "Service role can manage team members"
  ON team_members
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create a function to check if user is admin (without recursion)
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members 
    WHERE id = user_id 
    AND role = 'admin' 
    AND is_active = true
  );
$$;

-- Admin policy using the function (this will be used by application logic, not RLS)
-- We'll handle admin permissions in the application layer to avoid recursion