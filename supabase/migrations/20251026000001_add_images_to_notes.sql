-- ============================================================================
-- ADD IMAGE SUPPORT TO CLIENT NOTES
-- ============================================================================
-- This migration adds image/screenshot support to the notes system

-- ============================================================================
-- ADD COLUMNS
-- ============================================================================

-- Add image_url column to client_notes
ALTER TABLE client_notes ADD COLUMN IF NOT EXISTS image_url text;

-- Add image_url column to client_note_replies
ALTER TABLE client_note_replies ADD COLUMN IF NOT EXISTS image_url text;

-- ============================================================================
-- CREATE STORAGE BUCKET
-- ============================================================================

-- Create storage bucket for note images
INSERT INTO storage.buckets (id, name, public)
VALUES ('note-images', 'note-images', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload note images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'note-images' AND
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.id = auth.uid()
  )
);

-- Allow authenticated users to view images
CREATE POLICY "Authenticated users can view note images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'note-images' AND
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.id = auth.uid()
  )
);

-- Allow authenticated users to delete their own images
CREATE POLICY "Authenticated users can delete their own note images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'note-images' AND
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.id = auth.uid()
  )
);

-- ============================================================================
-- UPDATE VIEW
-- ============================================================================

-- Recreate the view to include image_url
DROP VIEW IF EXISTS client_notes_with_counts;

CREATE OR REPLACE VIEW client_notes_with_counts AS
SELECT 
  cn.*,
  COALESCE(reply_counts.reply_count, 0) as reply_count
FROM client_notes cn
LEFT JOIN (
  SELECT note_id, COUNT(*) as reply_count
  FROM client_note_replies
  GROUP BY note_id
) reply_counts ON cn.id = reply_counts.note_id;

-- Grant access to views
GRANT SELECT ON client_notes_with_counts TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN client_notes.image_url IS 'URL to uploaded screenshot/image stored in Supabase Storage';
COMMENT ON COLUMN client_note_replies.image_url IS 'URL to uploaded screenshot/image stored in Supabase Storage';

