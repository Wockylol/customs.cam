/*
  # Attendance System

  1. New Tables
    - `attendance_records`
      - `id` (uuid, primary key)
      - `team_member_id` (uuid, foreign key to team_members)
      - `date` (date)
      - `status` (enum: on_time, late, no_show)
      - `clock_in_time` (time, nullable - for late arrivals)
      - `notes` (text, nullable - for no-show reasons)
      - `recorded_by` (uuid, foreign key to team_members)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `attendance_records` table
    - Add policies for managers/admins to manage attendance
    - Add policy for team members to read their own attendance

  3. Indexes
    - Index on date and team_member_id for efficient queries
    - Index on recorded_by for audit trails
*/

-- Create attendance status enum
CREATE TYPE attendance_status AS ENUM ('on_time', 'late', 'no_show');

-- Create attendance_records table
CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id uuid NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  status attendance_status NOT NULL,
  clock_in_time time DEFAULT NULL,
  notes text DEFAULT NULL,
  recorded_by uuid NOT NULL REFERENCES team_members(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure one attendance record per team member per day
  UNIQUE(team_member_id, date)
);

-- Enable RLS
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- Policies for attendance management
CREATE POLICY "Managers and admins can manage attendance"
  ON attendance_records
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

-- Policy for team members to read their own attendance
CREATE POLICY "Team members can read own attendance"
  ON attendance_records
  FOR SELECT
  TO authenticated
  USING (team_member_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_date_member ON attendance_records(date, team_member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_recorded_by ON attendance_records(recorded_by);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);

-- Trigger for updated_at
CREATE TRIGGER update_attendance_records_updated_at
  BEFORE UPDATE ON attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();