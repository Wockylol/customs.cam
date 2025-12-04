-- ============================================================================
-- CLIENT NOTES SYSTEM
-- ============================================================================
-- This migration creates tables for a threaded notes system for clients
-- Features: Main notes, replies, pinning, timestamps, authorship

-- ============================================================================
-- DROP EXISTING (if any)
-- ============================================================================

DROP TABLE IF EXISTS client_note_replies CASCADE;
DROP TABLE IF EXISTS client_notes CASCADE;

-- ============================================================================
-- CREATE TABLES
-- ============================================================================

-- Main notes table
CREATE TABLE client_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES team_members(id) ON DELETE SET NULL,
  author_name text NOT NULL, -- Denormalized for performance and historical record
  content text NOT NULL,
  is_pinned boolean DEFAULT false,
  pinned_at timestamptz,
  pinned_by uuid REFERENCES team_members(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Indexes
  CONSTRAINT client_notes_content_not_empty CHECK (length(trim(content)) > 0)
);

-- Note replies table
CREATE TABLE client_note_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid REFERENCES client_notes(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES team_members(id) ON DELETE SET NULL,
  author_name text NOT NULL, -- Denormalized for performance and historical record
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Indexes
  CONSTRAINT client_note_replies_content_not_empty CHECK (length(trim(content)) > 0)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_client_notes_client_id ON client_notes(client_id);
CREATE INDEX idx_client_notes_created_at ON client_notes(created_at DESC);
CREATE INDEX idx_client_notes_pinned ON client_notes(client_id, is_pinned, created_at DESC) WHERE is_pinned = true;
CREATE INDEX idx_client_notes_author_id ON client_notes(author_id);

CREATE INDEX idx_client_note_replies_note_id ON client_note_replies(note_id);
CREATE INDEX idx_client_note_replies_created_at ON client_note_replies(created_at DESC);
CREATE INDEX idx_client_note_replies_author_id ON client_note_replies(author_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_note_replies ENABLE ROW LEVEL SECURITY;

-- Policies for client_notes
CREATE POLICY "Team members can view all client notes"
  ON client_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.id = auth.uid()
    )
  );

CREATE POLICY "Team members can create client notes"
  ON client_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.id = auth.uid()
    )
  );

CREATE POLICY "Authors can update their own notes"
  ON client_notes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.id = auth.uid()
      AND team_members.id = client_notes.author_id
    )
  );

CREATE POLICY "Authors can delete their own notes"
  ON client_notes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.id = auth.uid()
      AND team_members.id = client_notes.author_id
    )
  );

-- Policies for client_note_replies
CREATE POLICY "Team members can view all note replies"
  ON client_note_replies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.id = auth.uid()
    )
  );

CREATE POLICY "Team members can create note replies"
  ON client_note_replies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.id = auth.uid()
    )
  );

CREATE POLICY "Authors can update their own replies"
  ON client_note_replies
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.id = auth.uid()
      AND team_members.id = client_note_replies.author_id
    )
  );

CREATE POLICY "Authors can delete their own replies"
  ON client_note_replies
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.id = auth.uid()
      AND team_members.id = client_note_replies.author_id
    )
  );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_client_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_client_note_replies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to toggle pin status
CREATE OR REPLACE FUNCTION toggle_note_pin(
  p_note_id uuid,
  p_team_member_id uuid
)
RETURNS json AS $$
DECLARE
  v_current_pinned boolean;
  v_result json;
BEGIN
  -- Get current pin status
  SELECT is_pinned INTO v_current_pinned
  FROM client_notes
  WHERE id = p_note_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Note not found');
  END IF;
  
  -- Toggle the pin status
  UPDATE client_notes
  SET 
    is_pinned = NOT v_current_pinned,
    pinned_at = CASE WHEN NOT v_current_pinned THEN now() ELSE NULL END,
    pinned_by = CASE WHEN NOT v_current_pinned THEN p_team_member_id ELSE NULL END,
    updated_at = now()
  WHERE id = p_note_id
  RETURNING json_build_object(
    'id', id,
    'is_pinned', is_pinned,
    'pinned_at', pinned_at,
    'pinned_by', pinned_by
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_client_notes_timestamp
  BEFORE UPDATE ON client_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_client_notes_updated_at();

CREATE TRIGGER update_client_note_replies_timestamp
  BEFORE UPDATE ON client_note_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_client_note_replies_updated_at();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View for notes with reply counts
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

