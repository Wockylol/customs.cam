/*
  # Add shift column to team_members table

  1. Schema Changes
    - Add `shift` column to `team_members` table
    - Column type: text with check constraint for valid values
    - Valid values: '10-6', '6-2', '2-10'
    - Column is nullable (optional field)

  2. Constraints
    - Check constraint ensures only valid shift values
    - Default value can be set by application logic

  3. Index
    - Add index for performance when filtering by shift
*/

-- Add shift column to team_members table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'team_members' AND column_name = 'shift'
  ) THEN
    ALTER TABLE team_members ADD COLUMN shift text;
  END IF;
END $$;

-- Add check constraint for valid shift values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'team_members_shift_check'
  ) THEN
    ALTER TABLE team_members 
    ADD CONSTRAINT team_members_shift_check 
    CHECK (shift IS NULL OR shift IN ('10-6', '6-2', '2-10'));
  END IF;
END $$;

-- Add index for performance when filtering by shift
CREATE INDEX IF NOT EXISTS idx_team_members_shift 
ON team_members(shift) WHERE shift IS NOT NULL;

-- Add comment to document the column purpose
COMMENT ON COLUMN team_members.shift IS 'Work shift schedule: 10-6 (10am-6pm), 6-2 (6pm-2am), 2-10 (2am-10am)';