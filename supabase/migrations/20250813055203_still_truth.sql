/*
  # Create client preferences table

  1. New Tables
    - `client_preferences`
      - `id` (uuid, primary key)
      - `client_id` (uuid, foreign key to clients)
      - `minimum_pricing` (numeric, minimum price for customs)
      - `video_call` (boolean, allows video calls)
      - `audio_call` (boolean, allows audio calls)
      - `dick_rates` (boolean, allows dick rating content)
      - `fan_signs` (boolean, allows fan sign content)
      - `using_fans_name` (boolean, allows using fan's name)
      - `saying_specific_things` (boolean, allows saying specific things)
      - `roleplaying` (boolean, allows roleplaying content)
      - `using_toys_props` (boolean, allows toys/props)
      - `specific_outfits` (boolean, allows specific outfits)
      - `full_nudity_censored` (boolean, allows censored nudity)
      - `full_nudity_uncensored` (boolean, allows uncensored nudity)
      - `masturbation` (boolean, allows masturbation content)
      - `anal_content` (boolean, allows anal content)
      - `feet_content` (boolean, allows feet content)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `client_preferences` table
    - Add policy for team members to manage preferences
    - Add policy for team members to read preferences

  3. Constraints
    - One preference record per client (unique constraint)
    - Foreign key relationship to clients table
*/

CREATE TABLE IF NOT EXISTS client_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid UNIQUE NOT NULL,
  minimum_pricing numeric(10,2) DEFAULT 0,
  video_call boolean DEFAULT false,
  audio_call boolean DEFAULT false,
  dick_rates boolean DEFAULT false,
  fan_signs boolean DEFAULT false,
  using_fans_name boolean DEFAULT false,
  saying_specific_things boolean DEFAULT false,
  roleplaying boolean DEFAULT false,
  using_toys_props boolean DEFAULT false,
  specific_outfits boolean DEFAULT false,
  full_nudity_censored boolean DEFAULT false,
  full_nudity_uncensored boolean DEFAULT false,
  masturbation boolean DEFAULT false,
  anal_content boolean DEFAULT false,
  feet_content boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE client_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can manage client preferences"
  ON client_preferences
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.id = auth.uid() AND tm.is_active = true
    )
  );

CREATE POLICY "Team members can read client preferences"
  ON client_preferences
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.id = auth.uid() AND tm.is_active = true
    )
  );

-- Add foreign key constraint
ALTER TABLE client_preferences 
ADD CONSTRAINT client_preferences_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- Add updated_at trigger
CREATE TRIGGER update_client_preferences_updated_at
  BEFORE UPDATE ON client_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_client_preferences_client_id 
ON client_preferences(client_id);