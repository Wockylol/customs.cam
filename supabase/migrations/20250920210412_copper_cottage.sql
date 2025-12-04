/*
  # Add Client Platform Management

  1. New Tables
    - `platforms` - Master list of available platforms (OnlyFans, Fansly, etc.)
    - `client_platforms` - Junction table linking clients to platforms they're managed on

  2. Security
    - Enable RLS on both tables
    - Add policies for team member access

  3. Data
    - Pre-populate with common platforms
*/

-- Create platforms table
CREATE TABLE IF NOT EXISTS platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  color text DEFAULT '#6366f1',
  icon text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create client_platforms junction table
CREATE TABLE IF NOT EXISTS client_platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  platform_id uuid NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
  username_on_platform text,
  profile_url text,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, platform_id)
);

-- Enable RLS
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_platforms ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for platforms
CREATE POLICY "Team members can read platforms"
  ON platforms
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.id = auth.uid() AND tm.is_active = true
    )
  );

CREATE POLICY "Managers and admins can manage platforms"
  ON platforms
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

-- Add RLS policies for client_platforms
CREATE POLICY "Team members can read client platforms"
  ON client_platforms
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.id = auth.uid() AND tm.is_active = true
    )
  );

CREATE POLICY "Team members can manage client platforms"
  ON client_platforms
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.id = auth.uid() AND tm.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.id = auth.uid() AND tm.is_active = true
    )
  );

-- Add updated_at triggers
CREATE TRIGGER update_platforms_updated_at
  BEFORE UPDATE ON platforms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_platforms_updated_at
  BEFORE UPDATE ON client_platforms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_platforms_slug ON platforms(slug);
CREATE INDEX IF NOT EXISTS idx_platforms_active ON platforms(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_client_platforms_client_id ON client_platforms(client_id);
CREATE INDEX IF NOT EXISTS idx_client_platforms_platform_id ON client_platforms(platform_id);
CREATE INDEX IF NOT EXISTS idx_client_platforms_active ON client_platforms(is_active) WHERE is_active = true;

-- Insert default platforms
INSERT INTO platforms (name, slug, description, color, icon) VALUES
  ('OnlyFans', 'onlyfans', 'Premium content subscription platform', '#00AFF0', '🔥'),
  ('Fansly', 'fansly', 'Creator-focused subscription platform', '#FF6B9D', '💎'),
  ('Fanvue', 'fanvue', 'Interactive fan engagement platform', '#8B5CF6', '👁️'),
  ('SextPanther', 'sextpanther', 'Adult entertainment platform', '#F59E0B', '🐾'),
  ('ManyVids', 'manyvids', 'Adult video marketplace', '#EF4444', '🎬'),
  ('Chaturbate', 'chaturbate', 'Live cam platform', '#7C3AED', '📹')
ON CONFLICT (slug) DO NOTHING;