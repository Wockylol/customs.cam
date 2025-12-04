/*
  # Add Day Off status to attendance

  1. Database Changes
    - Add 'day_off' to attendance_status enum
    - Update existing constraints to include new status

  2. Security
    - No changes to RLS policies needed
    - Existing policies cover the new status
*/

-- Add 'day_off' to the attendance_status enum
ALTER TYPE attendance_status ADD VALUE IF NOT EXISTS 'day_off';