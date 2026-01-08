-- Expand client_idiolect_analysis to support behavior-level voice analysis
-- This migration adds a comprehensive JSONB column for the new analysis structure

-- Add new column for the complete voice analysis (JSONB for flexibility)
ALTER TABLE client_idiolect_analysis 
ADD COLUMN IF NOT EXISTS voice_analysis JSONB DEFAULT NULL;

-- Add comment explaining the structure
COMMENT ON COLUMN client_idiolect_analysis.voice_analysis IS 'Complete behavior-level voice analysis including:
- writingMechanics: capitalization, punctuation, emoji, abbreviations, formality, messageStructure
- signaturePatterns: greetings, petNames, closings, fillerWords, uniquePhrases
- neverDoes: behaviors to avoid (negative space rules)
- voiceModes: contextual tones for different situations
- chatterPlaybook: quickRules, doNot list, copyTheseExactly, replyTemplates';

-- Create index for faster queries on analysis status
CREATE INDEX IF NOT EXISTS idx_client_idiolect_voice_analysis 
ON client_idiolect_analysis USING GIN (voice_analysis);

