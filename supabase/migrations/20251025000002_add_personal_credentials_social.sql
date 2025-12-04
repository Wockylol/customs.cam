-- Create client_personal_info table for storing sensitive personal information
CREATE TABLE IF NOT EXISTS client_personal_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  legal_name TEXT,
  email TEXT,
  phone TEXT,
  date_of_birth DATE,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id)
);

-- Create client_platform_credentials table for storing platform login info
CREATE TABLE IF NOT EXISTS client_platform_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  email TEXT,
  password TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create client_social_media table for storing social media handles
CREATE TABLE IF NOT EXISTS client_social_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  username TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_client_personal_info_client_id ON client_personal_info(client_id);
CREATE INDEX IF NOT EXISTS idx_client_platform_credentials_client_id ON client_platform_credentials(client_id);
CREATE INDEX IF NOT EXISTS idx_client_social_media_client_id ON client_social_media(client_id);

-- Add comments
COMMENT ON TABLE client_personal_info IS 'Stores sensitive personal information for clients';
COMMENT ON TABLE client_platform_credentials IS 'Stores platform credentials (email/password) for various platforms';
COMMENT ON TABLE client_social_media IS 'Stores social media account handles for clients';

-- Enable Row Level Security
ALTER TABLE client_personal_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_platform_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_social_media ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_personal_info
CREATE POLICY "Team members can view personal info"
  ON client_personal_info FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.id = auth.uid() AND tm.is_active = true
    )
  );

CREATE POLICY "Team members can insert personal info"
  ON client_personal_info FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.id = auth.uid() AND tm.is_active = true
    )
  );

CREATE POLICY "Team members can update personal info"
  ON client_personal_info FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.id = auth.uid() AND tm.is_active = true
    )
  );

-- RLS Policies for client_platform_credentials
CREATE POLICY "Team members can view platform credentials"
  ON client_platform_credentials FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.id = auth.uid() AND tm.is_active = true
    )
  );

CREATE POLICY "Team members can insert platform credentials"
  ON client_platform_credentials FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.id = auth.uid() AND tm.is_active = true
    )
  );

CREATE POLICY "Team members can update platform credentials"
  ON client_platform_credentials FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.id = auth.uid() AND tm.is_active = true
    )
  );

CREATE POLICY "Team members can delete platform credentials"
  ON client_platform_credentials FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.id = auth.uid() AND tm.is_active = true
    )
  );

-- RLS Policies for client_social_media
CREATE POLICY "Team members can view social media"
  ON client_social_media FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.id = auth.uid() AND tm.is_active = true
    )
  );

CREATE POLICY "Team members can insert social media"
  ON client_social_media FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.id = auth.uid() AND tm.is_active = true
    )
  );

CREATE POLICY "Team members can update social media"
  ON client_social_media FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.id = auth.uid() AND tm.is_active = true
    )
  );

CREATE POLICY "Team members can delete social media"
  ON client_social_media FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.id = auth.uid() AND tm.is_active = true
    )
  );

-- Function to upsert personal info
CREATE OR REPLACE FUNCTION upsert_client_personal_info(
  p_client_id UUID,
  p_legal_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_date_of_birth DATE,
  p_address TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO client_personal_info (
    client_id, legal_name, email, phone, date_of_birth, address, updated_at
  )
  VALUES (
    p_client_id, p_legal_name, p_email, p_phone, p_date_of_birth, p_address, NOW()
  )
  ON CONFLICT (client_id)
  DO UPDATE SET
    legal_name = EXCLUDED.legal_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    date_of_birth = EXCLUDED.date_of_birth,
    address = EXCLUDED.address,
    updated_at = NOW();
END;
$$;

