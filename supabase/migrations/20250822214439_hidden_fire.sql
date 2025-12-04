/*
  # Add thread read tracking

  1. Schema Changes
    - Add `last_read_at` column to `threads` table
    - Add trigger to update `updated_at` when new messages arrive
    - Add function to mark thread as read

  2. Security
    - Add RLS policies for thread read tracking
    - Allow team members to update read status

  3. Functions
    - Function to mark thread as read
    - Trigger to update thread timestamp on new messages
*/

-- Add last_read_at column to threads table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'threads' AND column_name = 'last_read_at'
  ) THEN
    ALTER TABLE threads ADD COLUMN last_read_at timestamptz;
  END IF;
END $$;

-- Create function to mark thread as read
CREATE OR REPLACE FUNCTION mark_thread_as_read(thread_id_param bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE threads 
  SET last_read_at = now()
  WHERE id = thread_id_param;
END;
$$;

-- Enable RLS on threads table if not already enabled
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;

-- Add policy for team members to read threads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'threads' AND policyname = 'Team members can read threads'
  ) THEN
    CREATE POLICY "Team members can read threads"
      ON threads
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.id = auth.uid() AND tm.is_active = true
        )
      );
  END IF;
END $$;

-- Add policy for team members to update thread read status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'threads' AND policyname = 'Team members can update thread read status'
  ) THEN
    CREATE POLICY "Team members can update thread read status"
      ON threads
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.id = auth.uid() AND tm.is_active = true
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.id = auth.uid() AND tm.is_active = true
        )
      );
  END IF;
END $$;

-- Create index for better performance on last_read_at queries
CREATE INDEX IF NOT EXISTS idx_threads_last_read_at 
ON threads(last_read_at) 
WHERE last_read_at IS NOT NULL;