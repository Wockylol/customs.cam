/*
  # Add late_and_left_early status to attendance

  1. Database Changes
    - Add `late_and_left_early` to the attendance_status enum
    - This provides a dedicated status for users who both arrive late AND leave early

  2. Benefits
    - More accurate status tracking
    - Cleaner data structure
    - Better reporting capabilities
    - No need for notes to indicate combined status
*/

-- Add the new status to the enum
ALTER TYPE attendance_status ADD VALUE 'late_and_left_early';