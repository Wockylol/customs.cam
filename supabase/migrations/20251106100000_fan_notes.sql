-- Migration: Fan Notes System
-- Description: Allows team members to create notes about specific fans for each client
-- Created: 2025-11-06

-- Create fan_notes table
CREATE TABLE IF NOT EXISTS public.fan_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  fan_name TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  author_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fan_notes_content_check CHECK (char_length(content) >= 1 AND char_length(content) <= 10000),
  CONSTRAINT fan_notes_fan_name_check CHECK (char_length(fan_name) >= 1 AND char_length(fan_name) <= 200)
);

-- Create fan_note_replies table for threaded conversations
CREATE TABLE IF NOT EXISTS public.fan_note_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_note_id UUID NOT NULL REFERENCES public.fan_notes(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  author_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fan_note_replies_content_check CHECK (char_length(content) >= 1 AND char_length(content) <= 5000)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_fan_notes_client_id ON public.fan_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_fan_notes_fan_name ON public.fan_notes(fan_name);
CREATE INDEX IF NOT EXISTS idx_fan_notes_created_at ON public.fan_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fan_notes_author_id ON public.fan_notes(author_id);
CREATE INDEX IF NOT EXISTS idx_fan_note_replies_fan_note_id ON public.fan_note_replies(fan_note_id);
CREATE INDEX IF NOT EXISTS idx_fan_note_replies_created_at ON public.fan_note_replies(created_at DESC);

-- Create composite index for fan grouping queries
CREATE INDEX IF NOT EXISTS idx_fan_notes_client_fan ON public.fan_notes(client_id, fan_name);

-- Enable RLS
ALTER TABLE public.fan_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fan_note_replies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fan_notes

-- Allow team members to view all fan notes
CREATE POLICY "Team members can view fan notes"
  ON public.fan_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.id = auth.uid()
    )
  );

-- Allow team members to create fan notes
CREATE POLICY "Team members can create fan notes"
  ON public.fan_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.id = auth.uid()
      AND team_members.id = fan_notes.author_id
    )
  );

-- Allow authors to update their own fan notes
CREATE POLICY "Authors can update their own fan notes"
  ON public.fan_notes
  FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- Allow authors to delete their own fan notes
CREATE POLICY "Authors can delete their own fan notes"
  ON public.fan_notes
  FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

-- RLS Policies for fan_note_replies

-- Allow team members to view all fan note replies
CREATE POLICY "Team members can view fan note replies"
  ON public.fan_note_replies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.id = auth.uid()
    )
  );

-- Allow team members to create fan note replies
CREATE POLICY "Team members can create fan note replies"
  ON public.fan_note_replies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_members.id = auth.uid()
      AND team_members.id = fan_note_replies.author_id
    )
  );

-- Allow authors to update their own fan note replies
CREATE POLICY "Authors can update their own fan note replies"
  ON public.fan_note_replies
  FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- Allow authors to delete their own fan note replies
CREATE POLICY "Authors can delete their own fan note replies"
  ON public.fan_note_replies
  FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to auto-update updated_at
CREATE TRIGGER update_fan_notes_updated_at
  BEFORE UPDATE ON public.fan_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fan_note_replies_updated_at
  BEFORE UPDATE ON public.fan_note_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.fan_notes IS 'Stores notes about specific fans for each client';
COMMENT ON TABLE public.fan_note_replies IS 'Stores replies to fan notes for threaded conversations';
COMMENT ON COLUMN public.fan_notes.fan_name IS 'Name of the fan this note is about';
COMMENT ON COLUMN public.fan_notes.content IS 'Content of the note';
COMMENT ON COLUMN public.fan_notes.image_url IS 'Optional image/screenshot URL';

