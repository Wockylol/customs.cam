/*
  # Add client_platform_id column to chatter_assignments table

  1. Changes
    - Add `client_platform_id` column to `chatter_assignments` table
    - Column allows NULL values for backward compatibility
    - Add foreign key constraint to `client_platforms` table
    - Add index for performance

  2. Security
    - No changes to existing RLS policies needed
*/

-- Add the client_platform_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chatter_assignments' AND column_name = 'client_platform_id'
  ) THEN
    ALTER TABLE chatter_assignments ADD COLUMN client_platform_id uuid;
  END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'chatter_assignments_client_platform_id_fkey'
  ) THEN
    ALTER TABLE chatter_assignments 
    ADD CONSTRAINT chatter_assignments_client_platform_id_fkey 
    FOREIGN KEY (client_platform_id) REFERENCES client_platforms(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for performance if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_chatter_assignments_client_platform_id'
  ) THEN
    CREATE INDEX idx_chatter_assignments_client_platform_id 
    ON chatter_assignments(client_platform_id) 
    WHERE client_platform_id IS NOT NULL;
  END IF;
END $$;