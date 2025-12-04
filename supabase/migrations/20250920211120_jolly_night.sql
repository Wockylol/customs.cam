/*
  # Allow multiple platform accounts per client

  1. Database Changes
    - Remove unique constraint on (client_id, platform_id) to allow multiple accounts per platform
    - Add account_name field to distinguish between multiple accounts
    - Update indexes for better performance

  2. Security
    - Maintain existing RLS policies
    - Keep foreign key constraints intact
*/

-- Remove the unique constraint that prevents multiple accounts per platform
ALTER TABLE client_platforms DROP CONSTRAINT IF EXISTS client_platforms_client_id_platform_id_key;

-- Add account_name field to distinguish between multiple accounts on same platform
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_platforms' AND column_name = 'account_name'
  ) THEN
    ALTER TABLE client_platforms ADD COLUMN account_name text;
  END IF;
END $$;

-- Add new index for better performance with multiple accounts
CREATE INDEX IF NOT EXISTS idx_client_platforms_client_platform_account 
ON client_platforms(client_id, platform_id, account_name) 
WHERE is_active = true;

-- Update existing records to have a default account name if they don't have one
UPDATE client_platforms 
SET account_name = 'Main Account' 
WHERE account_name IS NULL OR account_name = '';