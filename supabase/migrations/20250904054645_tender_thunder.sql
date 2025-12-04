/*
  # Create chatter_assignments table

  1. New Tables
    - `chatter_assignments`
      - `id` (uuid, primary key)
      - `chatter_id` (uuid, foreign key to team_members)
      - `client_id` (uuid, foreign key to clients)
      - `assigned_by` (uuid, foreign key to team_members)
      - `assigned_at` (timestamp)
      - `is_active` (boolean)
      - `notes` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `chatter_assignments` table
    - Add policies for managers/admins to manage assignments
    - Add policy for chatters to read their own assignments

  3. Constraints
    - Unique constraint for active assignments (chatter_id, client_id, is_active)
    - Foreign key constraints with proper cascading
</*/

-- Create chatter_assignments table
CREATE TABLE IF NOT EXISTS chatter_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chatter_id uuid NOT NULL,
  client_id uuid NOT NULL,
  assigned_by uuid NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE chatter_assignments 
ADD CONSTRAINT chatter_assignments_chatter_id_fkey 
FOREIGN KEY (chatter_id) REFERENCES team_members(id) ON DELETE CASCADE;

ALTER TABLE chatter_assignments 
ADD CONSTRAINT chatter_assignments_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

ALTER TABLE chatter_assignments 
ADD CONSTRAINT chatter_assignments_assigned_by_fkey 
FOREIGN KEY (assigned_by) REFERENCES team_members(id);

-- Create unique constraint for active assignments only
CREATE UNIQUE INDEX IF NOT EXISTS chatter_assignments_unique_active 
ON chatter_assignments (chatter_id, client_id) 
WHERE is_active = true;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chatter_assignments_chatter_id 
ON chatter_assignments (chatter_id);

CREATE INDEX IF NOT EXISTS idx_chatter_assignments_client_id 
ON chatter_assignments (client_id);

CREATE INDEX IF NOT EXISTS idx_chatter_assignments_assigned_by 
ON chatter_assignments (assigned_by);

CREATE INDEX IF NOT EXISTS idx_chatter_assignments_active 
ON chatter_assignments (is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE chatter_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Managers and admins can manage assignments"
  ON chatter_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.id = auth.uid() 
      AND tm.is_active = true 
      AND tm.role IN ('manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.id = auth.uid() 
      AND tm.is_active = true 
      AND tm.role IN ('manager', 'admin')
    )
  );

CREATE POLICY "Chatters can read their own assignments"
  ON chatter_assignments
  FOR SELECT
  TO authenticated
  USING (chatter_id = auth.uid());

-- Create updated_at trigger
CREATE TRIGGER update_chatter_assignments_updated_at
  BEFORE UPDATE ON chatter_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();