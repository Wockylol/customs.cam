/*
  # Add team member tracking for outbound messages

  1. Schema Changes
    - Add `sent_by_team_member_id` column to `messages` table
    - Add foreign key constraint to `team_members` table
    - Add index for performance

  2. Security
    - Update RLS policies to allow team members to read messages they sent
    - Maintain existing permissions for message management

  3. Data Integrity
    - Foreign key ensures valid team member references
    - Nullable field for external/system messages
*/

-- Add sent_by_team_member_id column to messages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'sent_by_team_member_id'
  ) THEN
    ALTER TABLE messages ADD COLUMN sent_by_team_member_id uuid;
  END IF;
END $$;

-- Add foreign key constraint to team_members table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'messages_sent_by_team_member_id_fkey'
  ) THEN
    ALTER TABLE messages 
    ADD CONSTRAINT messages_sent_by_team_member_id_fkey 
    FOREIGN KEY (sent_by_team_member_id) REFERENCES team_members(id);
  END IF;
END $$;

-- Add index for performance on team member queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_messages_sent_by_team_member'
  ) THEN
    CREATE INDEX idx_messages_sent_by_team_member 
    ON messages(sent_by_team_member_id) 
    WHERE sent_by_team_member_id IS NOT NULL;
  END IF;
END $$;

-- Enable RLS on messages table if not already enabled
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Add policy for team members to read messages they sent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'messages' AND policyname = 'Team members can read messages they sent'
  ) THEN
    CREATE POLICY "Team members can read messages they sent"
      ON messages
      FOR SELECT
      TO authenticated
      USING (
        sent_by_team_member_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.id = auth.uid() AND tm.is_active = true
        )
      );
  END IF;
END $$;

-- Add policy for team members to insert messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'messages' AND policyname = 'Team members can insert messages'
  ) THEN
    CREATE POLICY "Team members can insert messages"
      ON messages
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.id = auth.uid() AND tm.is_active = true
        )
      );
  END IF;
END $$;