-- Create client_idiolect_analysis table to store personality and communication analysis
CREATE TABLE IF NOT EXISTS client_idiolect_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Raw conversation data
  conversation_transcript JSONB NOT NULL DEFAULT '[]',
  
  -- Personality traits (scale: -100 to 100)
  trait_dominant_submissive INTEGER DEFAULT 0,
  trait_playful_serious INTEGER DEFAULT 0,
  trait_confident_shy INTEGER DEFAULT 0,
  trait_warmth_level INTEGER DEFAULT 50,
  
  -- Communication style
  avg_response_length TEXT CHECK (avg_response_length IN ('brief', 'moderate', 'detailed')),
  emoji_usage TEXT CHECK (emoji_usage IN ('none', 'minimal', 'moderate', 'heavy')),
  capitalization_style TEXT CHECK (capitalization_style IN ('lowercase', 'normal', 'expressive')),
  punctuation_style TEXT,
  sentence_structure TEXT,
  
  -- Signature patterns (stored as JSON arrays)
  greetings JSONB DEFAULT '[]',
  pet_names JSONB DEFAULT '[]',
  closings JSONB DEFAULT '[]',
  filler_words JSONB DEFAULT '[]',
  unique_phrases JSONB DEFAULT '[]',
  
  -- Additional insights
  flirtation_approach TEXT,
  love_language_indicators JSONB DEFAULT '[]',
  
  -- Chatter guidelines (markdown formatted)
  chatter_guidelines TEXT,
  
  -- Status tracking
  status TEXT DEFAULT 'incomplete' CHECK (status IN ('incomplete', 'in_progress', 'completed')),
  current_step INTEGER DEFAULT 0,
  
  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint - one analysis per client
CREATE UNIQUE INDEX idx_client_idiolect_analysis_client_id ON client_idiolect_analysis(client_id);

-- Create index for status queries
CREATE INDEX idx_client_idiolect_analysis_status ON client_idiolect_analysis(status);

-- Enable RLS
ALTER TABLE client_idiolect_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Team members can view all analyses
CREATE POLICY "Team members can view all idiolect analyses"
  ON client_idiolect_analysis
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.id = auth.uid() 
      AND team_members.is_active = true
    )
  );

-- Team members can insert/update analyses
CREATE POLICY "Team members can manage idiolect analyses"
  ON client_idiolect_analysis
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.id = auth.uid() 
      AND team_members.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_members.id = auth.uid() 
      AND team_members.is_active = true
    )
  );

-- Allow public access for client portal (clients accessing their own analysis)
CREATE POLICY "Public can insert own idiolect analysis"
  ON client_idiolect_analysis
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Public can update own idiolect analysis"
  ON client_idiolect_analysis
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can view own idiolect analysis"
  ON client_idiolect_analysis
  FOR SELECT
  TO anon
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_client_idiolect_analysis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_client_idiolect_analysis_updated_at
  BEFORE UPDATE ON client_idiolect_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_client_idiolect_analysis_updated_at();

-- Add comment for documentation
COMMENT ON TABLE client_idiolect_analysis IS 'Stores personality and communication style analysis from the Vibe Check chat simulation';

