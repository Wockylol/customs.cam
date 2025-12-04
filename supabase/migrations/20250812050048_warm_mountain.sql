/*
  # Add client avatars support

  1. Schema Changes
    - Add `avatar_url` column to `clients` table to store avatar image URLs
    - Column allows null values for clients without avatars

  2. Storage
    - Assumes media/avatars bucket exists in Supabase storage
    - Avatar URLs will reference files in this bucket

  3. Security
    - No additional RLS changes needed as avatars follow existing client policies
*/

-- Add avatar_url column to clients table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE clients ADD COLUMN avatar_url text;
  END IF;
END $$;

-- Add index for avatar_url for potential future queries
CREATE INDEX IF NOT EXISTS idx_clients_avatar_url ON clients(avatar_url) WHERE avatar_url IS NOT NULL;