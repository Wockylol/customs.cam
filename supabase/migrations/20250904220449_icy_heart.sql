/*
  # Add left early status to attendance system

  1. Database Changes
    - Add 'left_early' to attendance_status enum
    - Add clock_out_time column to attendance_records table
    - Update existing constraints and indexes

  2. Features
    - Support for clock out time tracking
    - Multi-select capability for late + left_early combination
    - Maintains existing functionality for other statuses
*/

-- Add 'left_early' to the attendance_status enum
ALTER TYPE attendance_status ADD VALUE 'left_early';

-- Add clock_out_time column to attendance_records table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendance_records' AND column_name = 'clock_out_time'
  ) THEN
    ALTER TABLE attendance_records ADD COLUMN clock_out_time time without time zone;
  END IF;
END $$;

-- Add index for clock_out_time
CREATE INDEX IF NOT EXISTS idx_attendance_clock_out_time 
ON attendance_records (clock_out_time) 
WHERE clock_out_time IS NOT NULL;

-- Update the trigger function to handle the new column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';