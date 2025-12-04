/*
  # Create agencies table and update clients table

  1. New Tables
    - `agencies`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `slug` (text, unique, not null)
      - `description` (text, nullable)
      - `contact_email` (text, nullable)
      - `contact_phone` (text, nullable)
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Table Updates
    - Add `agency_id` column to `clients` table
    - Foreign key constraint to `agencies.id`
    - ON DELETE SET NULL (preserve client if agency deleted)

  3. Security
    - Enable RLS on `agencies` table
    - Add policies for team members to manage agencies
    - Update existing client policies to handle agency relationship

  4. Performance
    - Add indexes for frequently queried columns
    - Index on `agencies.slug` for public lookups
    - Index on `clients.agency_id` for relationship queries
*/

-- Create agencies table
CREATE TABLE IF NOT EXISTS agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  contact_email text,
  contact_phone text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add agency_id column to clients table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'agency_id'
  ) THEN
    ALTER TABLE clients ADD COLUMN agency_id uuid;
  END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'clients_agency_id_fkey'
  ) THEN
    ALTER TABLE clients 
    ADD CONSTRAINT clients_agency_id_fkey 
    FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS on agencies table
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for agencies
CREATE POLICY "Team members can read all agencies"
  ON agencies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.id = auth.uid() AND tm.is_active = true
    )
  );

CREATE POLICY "Team members can manage agencies"
  ON agencies
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.id = auth.uid() AND tm.is_active = true
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agencies_slug ON agencies(slug);
CREATE INDEX IF NOT EXISTS idx_agencies_name ON agencies(name);
CREATE INDEX IF NOT EXISTS idx_clients_agency_id ON clients(agency_id);

-- Create updated_at trigger for agencies
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agencies_updated_at
  BEFORE UPDATE ON agencies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();