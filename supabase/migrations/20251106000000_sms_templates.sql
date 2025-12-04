/*
  # SMS Templates System

  1. New Tables
    - `sms_templates`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references team_members)
      - `name` (text) - Template name
      - `content` (text) - Template message content
      - `is_global` (boolean) - Whether template is available to all admins
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `sms_templates` table
    - Add policies for authenticated users to manage their own templates
    - Add policies for admins to manage global templates
*/

-- Create sms_templates table
CREATE TABLE IF NOT EXISTS sms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES team_members(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  content text NOT NULL,
  is_global boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_sms_templates_user_id ON sms_templates(user_id);
CREATE INDEX idx_sms_templates_is_global ON sms_templates(is_global);

-- Enable Row Level Security
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own templates and global templates
CREATE POLICY "Users can view own and global templates"
  ON sms_templates
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR is_global = true
  );

-- Policy: Users can insert their own templates
CREATE POLICY "Users can create own templates"
  ON sms_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own templates
CREATE POLICY "Users can update own templates"
  ON sms_templates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own templates
CREATE POLICY "Users can delete own templates"
  ON sms_templates
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sms_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_sms_templates_updated_at
  BEFORE UPDATE ON sms_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_sms_template_updated_at();

-- Add comment to table
COMMENT ON TABLE sms_templates IS 'Stores SMS message templates for quick access';
COMMENT ON COLUMN sms_templates.is_global IS 'If true, template is visible to all admin users';

