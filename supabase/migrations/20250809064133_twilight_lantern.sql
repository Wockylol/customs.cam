/*
  # Simplify clients table

  1. Changes
    - Remove display_name column (use username as display)
    - Remove email column
    - Remove onlyfans_profile_url column
    - Keep only: id, username, phone, assigned_chatter_id, assigned_manager_id, is_active, created_at, updated_at

  2. Security
    - Maintain existing RLS policies
*/

-- Remove unnecessary columns
ALTER TABLE clients DROP COLUMN IF EXISTS display_name;
ALTER TABLE clients DROP COLUMN IF EXISTS email;
ALTER TABLE clients DROP COLUMN IF EXISTS onlyfans_profile_url;