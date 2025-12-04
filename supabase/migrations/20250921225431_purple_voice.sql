/*
  # Remove Chaturbate and ManyVids platforms

  1. Changes
    - Remove Chaturbate platform from platforms table
    - Remove ManyVids platform from platforms table
    - Set any client_platforms using these platforms to inactive

  2. Security
    - Uses safe deletion approach by deactivating rather than hard deleting
    - Preserves data integrity by keeping historical records
*/

-- First, deactivate any client platform assignments for these platforms
UPDATE client_platforms 
SET is_active = false 
WHERE platform_id IN (
  SELECT id FROM platforms 
  WHERE slug IN ('chaturbate', 'manyvids')
);

-- Then remove the platforms themselves
DELETE FROM platforms 
WHERE slug IN ('chaturbate', 'manyvids');