/*
  # Add fan_lifetime_spend column to custom_requests table

  1. Schema Changes
    - Add `fan_lifetime_spend` column to `custom_requests` table
    - Column type: numeric(10,2) to store currency values
    - Column is nullable (optional field)
    - Add index for performance on queries filtering by lifetime spend

  2. Notes
    - This column will store the fan's total lifetime spending amount
    - Used for prioritizing high-value customers
    - Helps with custom request pricing decisions
*/

-- Add fan_lifetime_spend column to custom_requests table
ALTER TABLE custom_requests 
ADD COLUMN IF NOT EXISTS fan_lifetime_spend numeric(10,2) DEFAULT NULL;

-- Add index for performance when filtering/sorting by lifetime spend
CREATE INDEX IF NOT EXISTS idx_custom_requests_fan_lifetime_spend 
ON custom_requests(fan_lifetime_spend);

-- Add comment to document the column purpose
COMMENT ON COLUMN custom_requests.fan_lifetime_spend IS 'Total lifetime spending amount of the fan making the custom request';