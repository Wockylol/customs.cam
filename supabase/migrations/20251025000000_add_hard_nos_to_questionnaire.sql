-- Add hard_nos column to client_questionnaire table
-- This field stores topics that are absolute hard limits/boundaries for the client

ALTER TABLE client_questionnaire 
ADD COLUMN IF NOT EXISTS hard_nos TEXT;

-- Add comment to document the column purpose
COMMENT ON COLUMN client_questionnaire.hard_nos IS 'Topics that are absolute hard limits or boundaries for the client - no tolerance topics';

-- Drop and recreate the upsert_client_questionnaire function to include hard_nos
DROP FUNCTION IF EXISTS upsert_client_questionnaire(UUID, JSONB);

CREATE OR REPLACE FUNCTION upsert_client_questionnaire(
  p_client_id UUID,
  p_questionnaire_data JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO client_questionnaire (
    client_id,
    public_name,
    public_nicknames,
    public_birthday,
    gender,
    native_language,
    other_languages,
    sexual_orientation,
    ethnicity,
    height,
    weight,
    shoe_size,
    bra_size,
    zodiac_sign,
    favorite_colors,
    birth_place,
    current_location,
    hobbies,
    college,
    current_car,
    dream_car,
    pets,
    favorite_place_traveled,
    dream_destination,
    relationship_status,
    dream_date,
    has_children,
    other_career,
    known_from,
    additional_info,
    hard_nos,
    updated_at
  )
  VALUES (
    p_client_id,
    (p_questionnaire_data->>'publicName')::TEXT,
    (p_questionnaire_data->>'publicNicknames')::TEXT,
    (p_questionnaire_data->>'publicBirthday')::DATE,
    (p_questionnaire_data->>'gender')::TEXT,
    (p_questionnaire_data->>'nativeLanguage')::TEXT,
    (p_questionnaire_data->>'otherLanguages')::TEXT,
    (p_questionnaire_data->>'sexualOrientation')::TEXT,
    (p_questionnaire_data->>'ethnicity')::TEXT,
    (p_questionnaire_data->>'height')::TEXT,
    (p_questionnaire_data->>'weight')::TEXT,
    (p_questionnaire_data->>'shoeSize')::TEXT,
    (p_questionnaire_data->>'braSize')::TEXT,
    (p_questionnaire_data->>'zodiacSign')::TEXT,
    (p_questionnaire_data->>'favoriteColors')::TEXT,
    (p_questionnaire_data->>'birthPlace')::TEXT,
    (p_questionnaire_data->>'currentLocation')::TEXT,
    (p_questionnaire_data->>'hobbies')::TEXT,
    (p_questionnaire_data->>'college')::TEXT,
    (p_questionnaire_data->>'currentCar')::TEXT,
    (p_questionnaire_data->>'dreamCar')::TEXT,
    (p_questionnaire_data->>'pets')::TEXT,
    (p_questionnaire_data->>'favoritePlaceTraveled')::TEXT,
    (p_questionnaire_data->>'dreamDestination')::TEXT,
    (p_questionnaire_data->>'relationshipStatus')::TEXT,
    (p_questionnaire_data->>'dreamDate')::TEXT,
    (p_questionnaire_data->>'hasChildren')::TEXT,
    (p_questionnaire_data->>'otherCareer')::TEXT,
    (p_questionnaire_data->>'knownFrom')::TEXT,
    (p_questionnaire_data->>'additionalInfo')::TEXT,
    (p_questionnaire_data->>'hardNos')::TEXT,
    NOW()
  )
  ON CONFLICT (client_id)
  DO UPDATE SET
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
    hard_nos = EXCLUDED.hard_nos,
    updated_at = NOW();
END;
$$;

-- Drop and recreate the client_complete_profile view to include hard_nos
DROP VIEW IF EXISTS client_complete_profile CASCADE;

CREATE VIEW client_complete_profile AS
SELECT 
  c.id,
  c.username,
  c.phone,
  c.avatar_url,
  c.is_active,
  c.agency_id,
  c.assigned_chatter_id,
  c.assigned_manager_id,
  c.created_at,
  c.updated_at,
  cq.public_name,
  cq.public_nicknames,
  cq.public_birthday,
  cq.gender,
  cq.native_language,
  cq.other_languages,
  cq.sexual_orientation,
  cq.ethnicity,
  cq.height,
  cq.weight,
  cq.shoe_size,
  cq.bra_size,
  cq.zodiac_sign,
  cq.favorite_colors,
  cq.birth_place,
  cq.current_location,
  cq.hobbies,
  cq.college,
  cq.current_car,
  cq.dream_car,
  cq.pets,
  cq.favorite_place_traveled,
  cq.dream_destination,
  cq.relationship_status,
  cq.dream_date,
  cq.has_children,
  cq.other_career,
  cq.known_from,
  cq.additional_info,
  cq.hard_nos,
  COALESCE(
    (SELECT json_agg(cp.persona ORDER BY cp.persona)
     FROM client_personas cp
     WHERE cp.client_id = c.id),
    '[]'::json
  ) as personas
FROM clients c
LEFT JOIN client_questionnaire cq ON c.id = cq.client_id;

