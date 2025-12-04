/*
  # Fix team member deletion foreign key constraints

  1. Changes
    - Drop existing foreign key constraints that prevent team member deletion
    - Add new constraints with ON DELETE SET NULL to allow safe deletion
    - Update constraints for custom_requests, chatter_assignments, attendance_records, and activity_logs tables

  2. Security
    - Maintains referential integrity while allowing safe deletion
    - Sets foreign key references to NULL when team member is deleted
    - Preserves historical data in custom requests and other records
*/

-- Fix custom_requests created_by constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'custom_requests_created_by_fkey'
  ) THEN
    ALTER TABLE custom_requests DROP CONSTRAINT custom_requests_created_by_fkey;
  END IF;
END $$;

ALTER TABLE custom_requests 
ADD CONSTRAINT custom_requests_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES team_members(id) ON DELETE SET NULL;

-- Fix custom_requests assigned_to constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'custom_requests_assigned_to_fkey'
  ) THEN
    ALTER TABLE custom_requests DROP CONSTRAINT custom_requests_assigned_to_fkey;
  END IF;
END $$;

ALTER TABLE custom_requests 
ADD CONSTRAINT custom_requests_assigned_to_fkey 
FOREIGN KEY (assigned_to) REFERENCES team_members(id) ON DELETE SET NULL;

-- Fix custom_requests team_approved_by constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'custom_requests_team_approved_by_fkey'
  ) THEN
    ALTER TABLE custom_requests DROP CONSTRAINT custom_requests_team_approved_by_fkey;
  END IF;
END $$;

ALTER TABLE custom_requests 
ADD CONSTRAINT custom_requests_team_approved_by_fkey 
FOREIGN KEY (team_approved_by) REFERENCES team_members(id) ON DELETE SET NULL;

-- Fix clients assigned_chatter_id constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'clients_assigned_chatter_id_fkey'
  ) THEN
    ALTER TABLE clients DROP CONSTRAINT clients_assigned_chatter_id_fkey;
  END IF;
END $$;

ALTER TABLE clients 
ADD CONSTRAINT clients_assigned_chatter_id_fkey 
FOREIGN KEY (assigned_chatter_id) REFERENCES team_members(id) ON DELETE SET NULL;

-- Fix clients assigned_manager_id constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'clients_assigned_manager_id_fkey'
  ) THEN
    ALTER TABLE clients DROP CONSTRAINT clients_assigned_manager_id_fkey;
  END IF;
END $$;

ALTER TABLE clients 
ADD CONSTRAINT clients_assigned_manager_id_fkey 
FOREIGN KEY (assigned_manager_id) REFERENCES team_members(id) ON DELETE SET NULL;

-- Fix chatter_assignments assigned_by constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chatter_assignments_assigned_by_fkey'
  ) THEN
    ALTER TABLE chatter_assignments DROP CONSTRAINT chatter_assignments_assigned_by_fkey;
  END IF;
END $$;

ALTER TABLE chatter_assignments 
ADD CONSTRAINT chatter_assignments_assigned_by_fkey 
FOREIGN KEY (assigned_by) REFERENCES team_members(id) ON DELETE SET NULL;

-- Fix activity_logs performed_by constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'activity_logs_performed_by_fkey'
  ) THEN
    ALTER TABLE activity_logs DROP CONSTRAINT activity_logs_performed_by_fkey;
  END IF;
END $$;

ALTER TABLE activity_logs 
ADD CONSTRAINT activity_logs_performed_by_fkey 
FOREIGN KEY (performed_by) REFERENCES team_members(id) ON DELETE SET NULL;

-- Fix attendance_records recorded_by constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'attendance_records_recorded_by_fkey'
  ) THEN
    ALTER TABLE attendance_records DROP CONSTRAINT attendance_records_recorded_by_fkey;
  END IF;
END $$;

ALTER TABLE attendance_records 
ADD CONSTRAINT attendance_records_recorded_by_fkey 
FOREIGN KEY (recorded_by) REFERENCES team_members(id) ON DELETE SET NULL;

-- Fix messages sent_by_team_member_id constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'messages_sent_by_team_member_id_fkey'
  ) THEN
    ALTER TABLE messages DROP CONSTRAINT messages_sent_by_team_member_id_fkey;
  END IF;
END $$;

ALTER TABLE messages 
ADD CONSTRAINT messages_sent_by_team_member_id_fkey 
FOREIGN KEY (sent_by_team_member_id) REFERENCES team_members(id) ON DELETE SET NULL;