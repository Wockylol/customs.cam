/*
  # Add team approval tracking columns to custom_requests

  1. Changes
    - Add `team_approved_by` column to track which team member approved the request
    - Add `team_approved_at` column to track when the team approval occurred
    - Add `client_approved_at` column to track when client approved the request
    - Add `estimated_delivery_date` column for delivery date tracking

  2. Security
    - No RLS changes needed as existing policies cover these columns
*/

-- Add team approval tracking columns
DO $$
BEGIN
  -- Add team_approved_by column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'custom_requests' AND column_name = 'team_approved_by'
  ) THEN
    ALTER TABLE custom_requests ADD COLUMN team_approved_by uuid REFERENCES team_members(id);
  END IF;

  -- Add team_approved_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'custom_requests' AND column_name = 'team_approved_at'
  ) THEN
    ALTER TABLE custom_requests ADD COLUMN team_approved_at timestamptz;
  END IF;

  -- Add client_approved_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'custom_requests' AND column_name = 'client_approved_at'
  ) THEN
    ALTER TABLE custom_requests ADD COLUMN client_approved_at timestamptz;
  END IF;

  -- Add estimated_delivery_date column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'custom_requests' AND column_name = 'estimated_delivery_date'
  ) THEN
    ALTER TABLE custom_requests ADD COLUMN estimated_delivery_date date;
  END IF;
END $$;