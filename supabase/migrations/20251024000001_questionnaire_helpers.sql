/*
  # Client Questionnaire Complete Schema
  
  This migration combines table creation, functions, and views for the client questionnaire system.
  
  1. Tables
    - client_questionnaire
    - client_personas
    - client_content_details
  
  2. Functions
    - upsert_client_questionnaire
    - set_client_personas
    - upsert_client_content_detail
  
  3. Views
    - client_complete_profile
    - client_content_offerings
*/

-- ============================================================================
-- TABLES
-- ============================================================================

-- Create client_questionnaire table
CREATE TABLE IF NOT EXISTS client_questionnaire (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Basic Info
  public_name text,
  public_nicknames text,
  public_birthday date,
  gender text,
  
  -- Languages
  native_language text,
  other_languages text,
  
  -- Personal Details
  sexual_orientation text,
  ethnicity text,
  height text,
  weight text,
  shoe_size text,
  bra_size text,
  zodiac_sign text,
  favorite_colors text,
  
  -- Location
  birth_place text,
  current_location text,
  
  -- Lifestyle
  hobbies text,
  college text,
  current_car text,
  dream_car text,
  pets text,
  
  -- Travel
  favorite_place_traveled text,
  dream_destination text,
  
  -- Relationship
  relationship_status text,
  dream_date text,
  has_children text,
  
  -- Career & Background
  other_career text,
  known_from text,
  additional_info text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create client_personas table
CREATE TABLE IF NOT EXISTS client_personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  persona text NOT NULL,
  created_at timestamptz DEFAULT now(),
  
  -- Ensure unique combination of client and persona
  UNIQUE(client_id, persona)
);

-- Create client_content_details table
CREATE TABLE IF NOT EXISTS client_content_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  content_type text NOT NULL,
  enabled boolean DEFAULT false,
  price_min decimal(10, 2) DEFAULT 0,
  price_max decimal(10, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure unique combination of client and content type
  UNIQUE(client_id, content_type)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_client_questionnaire_client_id ON client_questionnaire(client_id);
CREATE INDEX IF NOT EXISTS idx_client_personas_client_id ON client_personas(client_id);
CREATE INDEX IF NOT EXISTS idx_client_content_details_client_id ON client_content_details(client_id);
CREATE INDEX IF NOT EXISTS idx_client_content_details_enabled ON client_content_details(client_id, enabled) WHERE enabled = true;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE client_questionnaire ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_content_details ENABLE ROW LEVEL SECURITY;

-- Policies for client_questionnaire
CREATE POLICY "Team members can view all questionnaire data"
  ON client_questionnaire FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.id = auth.uid() AND team_members.is_active = true));

CREATE POLICY "Team members can insert questionnaire data"
  ON client_questionnaire FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM team_members WHERE team_members.id = auth.uid() AND team_members.is_active = true));

CREATE POLICY "Team members can update questionnaire data"
  ON client_questionnaire FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.id = auth.uid() AND team_members.is_active = true));

-- Policies for client_personas
CREATE POLICY "Team members can view all personas"
  ON client_personas FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.id = auth.uid() AND team_members.is_active = true));

CREATE POLICY "Team members can insert personas"
  ON client_personas FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM team_members WHERE team_members.id = auth.uid() AND team_members.is_active = true));

CREATE POLICY "Team members can delete personas"
  ON client_personas FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.id = auth.uid() AND team_members.is_active = true));

-- Policies for client_content_details
CREATE POLICY "Team members can view all content details"
  ON client_content_details FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.id = auth.uid() AND team_members.is_active = true));

CREATE POLICY "Team members can insert content details"
  ON client_content_details FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM team_members WHERE team_members.id = auth.uid() AND team_members.is_active = true));

CREATE POLICY "Team members can update content details"
  ON client_content_details FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.id = auth.uid() AND team_members.is_active = true));

CREATE POLICY "Team members can delete content details"
  ON client_content_details FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM team_members WHERE team_members.id = auth.uid() AND team_members.is_active = true));

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp for questionnaire
CREATE OR REPLACE FUNCTION update_client_questionnaire_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp for content details
CREATE OR REPLACE FUNCTION update_client_content_details_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to upsert client questionnaire data
CREATE OR REPLACE FUNCTION upsert_client_questionnaire(
  p_client_id uuid,
  p_questionnaire_data jsonb
)
RETURNS uuid AS $$
DECLARE
  v_questionnaire_id uuid;
BEGIN
  INSERT INTO client_questionnaire (
    client_id, public_name, public_nicknames, public_birthday, gender,
    native_language, other_languages, sexual_orientation, ethnicity,
    height, weight, shoe_size, bra_size, zodiac_sign, favorite_colors,
    birth_place, current_location, hobbies, college, current_car, dream_car,
    pets, favorite_place_traveled, dream_destination, relationship_status,
    dream_date, has_children, other_career, known_from, additional_info
  )
  VALUES (
    p_client_id,
    p_questionnaire_data->>'publicName',
    p_questionnaire_data->>'publicNicknames',
    (p_questionnaire_data->>'publicBirthday')::date,
    p_questionnaire_data->>'gender',
    p_questionnaire_data->>'nativeLanguage',
    p_questionnaire_data->>'otherLanguages',
    p_questionnaire_data->>'sexualOrientation',
    p_questionnaire_data->>'ethnicity',
    p_questionnaire_data->>'height',
    p_questionnaire_data->>'weight',
    p_questionnaire_data->>'shoeSize',
    p_questionnaire_data->>'braSize',
    p_questionnaire_data->>'zodiacSign',
    p_questionnaire_data->>'favoriteColors',
    p_questionnaire_data->>'birthPlace',
    p_questionnaire_data->>'currentLocation',
    p_questionnaire_data->>'hobbies',
    p_questionnaire_data->>'college',
    p_questionnaire_data->>'currentCar',
    p_questionnaire_data->>'dreamCar',
    p_questionnaire_data->>'pets',
    p_questionnaire_data->>'favoritePlaceTraveled',
    p_questionnaire_data->>'dreamDestination',
    p_questionnaire_data->>'relationshipStatus',
    p_questionnaire_data->>'dreamDate',
    p_questionnaire_data->>'hasChildren',
    p_questionnaire_data->>'otherCareer',
    p_questionnaire_data->>'knownFrom',
    p_questionnaire_data->>'additionalInfo'
  )
  ON CONFLICT (client_id) DO UPDATE SET
    public_name = EXCLUDED.public_name,
    public_nicknames = EXCLUDED.public_nicknames,
    public_birthday = EXCLUDED.public_birthday,
    gender = EXCLUDED.gender,
    native_language = EXCLUDED.native_language,
    other_languages = EXCLUDED.other_languages,
    sexual_orientation = EXCLUDED.sexual_orientation,
    ethnicity = EXCLUDED.ethnicity,
    height = EXCLUDED.height,
    weight = EXCLUDED.weight,
    shoe_size = EXCLUDED.shoe_size,
    bra_size = EXCLUDED.bra_size,
    zodiac_sign = EXCLUDED.zodiac_sign,
    favorite_colors = EXCLUDED.favorite_colors,
    birth_place = EXCLUDED.birth_place,
    current_location = EXCLUDED.current_location,
    hobbies = EXCLUDED.hobbies,
    college = EXCLUDED.college,
    current_car = EXCLUDED.current_car,
    dream_car = EXCLUDED.dream_car,
    pets = EXCLUDED.pets,
    favorite_place_traveled = EXCLUDED.favorite_place_traveled,
    dream_destination = EXCLUDED.dream_destination,
    relationship_status = EXCLUDED.relationship_status,
    dream_date = EXCLUDED.dream_date,
    has_children = EXCLUDED.has_children,
    other_career = EXCLUDED.other_career,
    known_from = EXCLUDED.known_from,
    additional_info = EXCLUDED.additional_info,
    updated_at = now()
  RETURNING id INTO v_questionnaire_id;
  
  RETURN v_questionnaire_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set client personas
CREATE OR REPLACE FUNCTION set_client_personas(
  p_client_id uuid,
  p_personas text[]
)
RETURNS void AS $$
BEGIN
  DELETE FROM client_personas WHERE client_id = p_client_id;
  
  IF array_length(p_personas, 1) > 0 THEN
    INSERT INTO client_personas (client_id, persona)
    SELECT p_client_id, unnest(p_personas);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to upsert client content details
CREATE OR REPLACE FUNCTION upsert_client_content_detail(
  p_client_id uuid,
  p_content_type text,
  p_enabled boolean,
  p_price_min decimal,
  p_price_max decimal
)
RETURNS uuid AS $$
DECLARE
  v_content_detail_id uuid;
BEGIN
  INSERT INTO client_content_details (
    client_id, content_type, enabled, price_min, price_max
  )
  VALUES (
    p_client_id, p_content_type, p_enabled, p_price_min, p_price_max
  )
  ON CONFLICT (client_id, content_type) DO UPDATE SET
    enabled = EXCLUDED.enabled,
    price_min = EXCLUDED.price_min,
    price_max = EXCLUDED.price_max,
    updated_at = now()
  RETURNING id INTO v_content_detail_id;
  
  RETURN v_content_detail_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_client_questionnaire_timestamp
  BEFORE UPDATE ON client_questionnaire
  FOR EACH ROW
  EXECUTE FUNCTION update_client_questionnaire_updated_at();

CREATE TRIGGER update_client_content_details_timestamp
  BEFORE UPDATE ON client_content_details
  FOR EACH ROW
  EXECUTE FUNCTION update_client_content_details_updated_at();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Create view for complete client profile
CREATE OR REPLACE VIEW client_complete_profile AS
SELECT 
  c.id, c.username, c.phone, c.avatar_url, c.is_active, c.agency_id,
  c.assigned_chatter_id, c.assigned_manager_id,
  cq.public_name, cq.public_nicknames, cq.public_birthday, cq.gender,
  cq.native_language, cq.other_languages, cq.sexual_orientation, cq.ethnicity,
  cq.height, cq.weight, cq.shoe_size, cq.bra_size, cq.zodiac_sign, cq.favorite_colors,
  cq.birth_place, cq.current_location, cq.hobbies, cq.college, cq.current_car, cq.dream_car,
  cq.pets, cq.favorite_place_traveled, cq.dream_destination, cq.relationship_status,
  cq.dream_date, cq.has_children, cq.other_career, cq.known_from, cq.additional_info,
  COALESCE(array_agg(DISTINCT cp.persona) FILTER (WHERE cp.persona IS NOT NULL), ARRAY[]::text[]) as personas,
  COUNT(DISTINCT cd.id) FILTER (WHERE cd.enabled = true) as content_types_count,
  c.created_at, c.updated_at
FROM clients c
LEFT JOIN client_questionnaire cq ON c.id = cq.client_id
LEFT JOIN client_personas cp ON c.id = cp.client_id
LEFT JOIN client_content_details cd ON c.id = cd.client_id
GROUP BY 
  c.id, c.username, c.phone, c.avatar_url, c.is_active, c.agency_id,
  c.assigned_chatter_id, c.assigned_manager_id,
  cq.public_name, cq.public_nicknames, cq.public_birthday, cq.gender,
  cq.native_language, cq.other_languages, cq.sexual_orientation, cq.ethnicity,
  cq.height, cq.weight, cq.shoe_size, cq.bra_size, cq.zodiac_sign, cq.favorite_colors,
  cq.birth_place, cq.current_location, cq.hobbies, cq.college, cq.current_car, cq.dream_car,
  cq.pets, cq.favorite_place_traveled, cq.dream_destination, cq.relationship_status,
  cq.dream_date, cq.has_children, cq.other_career, cq.known_from, cq.additional_info,
  c.created_at, c.updated_at;

-- Create view for client content offerings
CREATE OR REPLACE VIEW client_content_offerings AS
SELECT 
  c.id as client_id, c.username,
  cd.content_type, cd.enabled, cd.price_min, cd.price_max,
  cd.created_at, cd.updated_at
FROM clients c
INNER JOIN client_content_details cd ON c.id = cd.client_id
WHERE cd.enabled = true
ORDER BY c.username, cd.content_type;

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION upsert_client_questionnaire TO authenticated;
GRANT EXECUTE ON FUNCTION set_client_personas TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_client_content_detail TO authenticated;

GRANT SELECT ON client_complete_profile TO authenticated;
GRANT SELECT ON client_content_offerings TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE client_questionnaire IS 'Stores comprehensive profile questionnaire responses for clients';
COMMENT ON TABLE client_personas IS 'Stores personality traits/personas selected by clients (multi-select)';
COMMENT ON TABLE client_content_details IS 'Stores content types offered by clients with pricing information';

COMMENT ON FUNCTION upsert_client_questionnaire IS 'Upserts client questionnaire data from a JSONB object';
COMMENT ON FUNCTION set_client_personas IS 'Replaces all personas for a client with a new array of personas';
COMMENT ON FUNCTION upsert_client_content_detail IS 'Upserts a single content detail record for a client';

COMMENT ON VIEW client_complete_profile IS 'Complete client profile including questionnaire data and personas';
COMMENT ON VIEW client_content_offerings IS 'All enabled content offerings by clients with pricing';

