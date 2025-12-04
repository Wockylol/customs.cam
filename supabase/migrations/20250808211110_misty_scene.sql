/*
  # Initial Schema for OnlyFans Management Agency

  1. New Tables
    - `team_members`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `full_name` (text)
      - `role` (enum: admin, manager, chatter)
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `clients`
      - `id` (uuid, primary key)
      - `username` (text, unique)
      - `display_name` (text)
      - `email` (text, optional)
      - `phone` (text, optional)
      - `onlyfans_profile_url` (text, optional)
      - `assigned_chatter_id` (uuid, references team_members)
      - `assigned_manager_id` (uuid, references team_members)
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `custom_requests`
      - `id` (uuid, primary key)
      - `client_id` (uuid, references clients)
      - `fan_name` (text)
      - `fan_email` (text, optional)
      - `description` (text)
      - `proposed_amount` (decimal)
      - `amount_paid` (decimal, optional)
      - `length_duration` (text)
      - `status` (enum: pending, in_progress, completed, cancelled)
      - `priority` (enum: low, medium, high, urgent)
      - `notes` (text, optional)
      - `chat_link` (text, optional)
      - `date_submitted` (date)
      - `date_due` (date, optional)
      - `date_completed` (date, optional)
      - `assigned_to` (uuid, references team_members)
      - `created_by` (uuid, references team_members)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `content_uploads`
      - `id` (uuid, primary key)
      - `custom_request_id` (uuid, references custom_requests)
      - `file_name` (text)
      - `file_path` (text)
      - `file_size` (bigint)
      - `file_type` (text)
      - `uploaded_by` (text, default 'client')
      - `upload_date` (timestamp)
    
    - `activity_logs`
      - `id` (uuid, primary key)
      - `table_name` (text)
      - `record_id` (uuid)
      - `action` (enum: created, updated, deleted)
      - `old_values` (jsonb, optional)
      - `new_values` (jsonb, optional)
      - `performed_by` (uuid, references team_members)
      - `performed_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for team member access based on roles
    - Add policies for client access to their own data
    
  3. Indexes
    - Add performance indexes for common queries
*/

-- Create custom types
CREATE TYPE team_role AS ENUM ('admin', 'manager', 'chatter');
CREATE TYPE request_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE request_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE activity_action AS ENUM ('created', 'updated', 'deleted');

-- Team Members table (extends auth.users)
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role team_role NOT NULL DEFAULT 'chatter',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  display_name text NOT NULL,
  email text,
  phone text,
  onlyfans_profile_url text,
  assigned_chatter_id uuid REFERENCES team_members(id),
  assigned_manager_id uuid REFERENCES team_members(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Custom Requests table
CREATE TABLE IF NOT EXISTS custom_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  fan_name text NOT NULL,
  fan_email text,
  description text NOT NULL,
  proposed_amount decimal(10,2) NOT NULL DEFAULT 0,
  amount_paid decimal(10,2),
  length_duration text,
  status request_status DEFAULT 'pending',
  priority request_priority DEFAULT 'medium',
  notes text,
  chat_link text,
  date_submitted date DEFAULT CURRENT_DATE,
  date_due date,
  date_completed date,
  assigned_to uuid REFERENCES team_members(id),
  created_by uuid REFERENCES team_members(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Content Uploads table
CREATE TABLE IF NOT EXISTS content_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_request_id uuid NOT NULL REFERENCES custom_requests(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  file_type text NOT NULL,
  uploaded_by text DEFAULT 'client',
  upload_date timestamptz DEFAULT now()
);

-- Activity Logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action activity_action NOT NULL,
  old_values jsonb,
  new_values jsonb,
  performed_by uuid REFERENCES team_members(id),
  performed_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_members
CREATE POLICY "Team members can read all team member data"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.id = auth.uid() AND tm.is_active = true
    )
  );

CREATE POLICY "Admins can manage team members"
  ON team_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.id = auth.uid() AND tm.role = 'admin' AND tm.is_active = true
    )
  );

-- RLS Policies for clients
CREATE POLICY "Team members can read all clients"
  ON clients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.id = auth.uid() AND tm.is_active = true
    )
  );

CREATE POLICY "Team members can manage clients"
  ON clients
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.id = auth.uid() AND tm.is_active = true
    )
  );

-- RLS Policies for custom_requests
CREATE POLICY "Team members can read all custom requests"
  ON custom_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.id = auth.uid() AND tm.is_active = true
    )
  );

CREATE POLICY "Team members can manage custom requests"
  ON custom_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.id = auth.uid() AND tm.is_active = true
    )
  );

-- RLS Policies for content_uploads
CREATE POLICY "Team members can read all content uploads"
  ON content_uploads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.id = auth.uid() AND tm.is_active = true
    )
  );

CREATE POLICY "Team members can manage content uploads"
  ON content_uploads
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.id = auth.uid() AND tm.is_active = true
    )
  );

-- RLS Policies for activity_logs
CREATE POLICY "Team members can read activity logs"
  ON activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.id = auth.uid() AND tm.is_active = true
    )
  );

CREATE POLICY "System can insert activity logs"
  ON activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_username ON clients(username);
CREATE INDEX IF NOT EXISTS idx_clients_assigned_chatter ON clients(assigned_chatter_id);
CREATE INDEX IF NOT EXISTS idx_clients_assigned_manager ON clients(assigned_manager_id);
CREATE INDEX IF NOT EXISTS idx_custom_requests_client_id ON custom_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_custom_requests_status ON custom_requests(status);
CREATE INDEX IF NOT EXISTS idx_custom_requests_assigned_to ON custom_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_custom_requests_date_submitted ON custom_requests(date_submitted);
CREATE INDEX IF NOT EXISTS idx_content_uploads_custom_request_id ON content_uploads(custom_request_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_table_record ON activity_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_performed_by ON activity_logs(performed_by);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_team_members_updated_at 
  BEFORE UPDATE ON team_members 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at 
  BEFORE UPDATE ON clients 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_requests_updated_at 
  BEFORE UPDATE ON custom_requests 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();