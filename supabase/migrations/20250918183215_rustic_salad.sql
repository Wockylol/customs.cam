/*
  # Create custom_notes table

  1. New Tables
    - `custom_notes`
      - `id` (uuid, primary key)
      - `custom_request_id` (uuid, foreign key to custom_requests)
      - `content` (text, the note content)
      - `created_by` (uuid, foreign key to team_members)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `custom_notes` table
    - Add policies for team members to manage notes
    - Add indexes for performance

  3. Features
    - Automatic updated_at trigger
    - Foreign key constraints for data integrity
*/

-- Create custom_notes table
CREATE TABLE IF NOT EXISTS custom_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_request_id uuid NOT NULL REFERENCES custom_requests(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_by uuid NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE custom_notes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Team members can read all custom notes"
  ON custom_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.id = auth.uid() AND tm.is_active = true
    )
  );

CREATE POLICY "Team members can insert custom notes"
  ON custom_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.id = auth.uid() AND tm.is_active = true
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "Team members can update own custom notes"
  ON custom_notes
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Team members can delete own custom notes"
  ON custom_notes
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_custom_notes_custom_request_id 
  ON custom_notes(custom_request_id);

CREATE INDEX IF NOT EXISTS idx_custom_notes_created_by 
  ON custom_notes(created_by);

CREATE INDEX IF NOT EXISTS idx_custom_notes_created_at 
  ON custom_notes(created_at);

-- Add updated_at trigger
CREATE TRIGGER update_custom_notes_updated_at
  BEFORE UPDATE ON custom_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();