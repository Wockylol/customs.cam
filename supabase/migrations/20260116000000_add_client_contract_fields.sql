-- Add contract management fields to clients table
-- These fields track the agency-client contract relationship

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS contract_percentage NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS contract_term TEXT,
ADD COLUMN IF NOT EXISTS contract_start_date DATE,
ADD COLUMN IF NOT EXISTS contract_resign_date DATE;

-- Add comments for documentation
COMMENT ON COLUMN clients.contract_percentage IS 'Agency percentage cut from client earnings';
COMMENT ON COLUMN clients.contract_term IS 'Contract duration/terms description';
COMMENT ON COLUMN clients.contract_start_date IS 'Date when contract started';
COMMENT ON COLUMN clients.contract_resign_date IS 'Date when client resigned/contract ended';

-- Create index for filtering by contract dates
CREATE INDEX IF NOT EXISTS idx_clients_contract_dates 
ON clients(contract_start_date, contract_resign_date) 
WHERE contract_start_date IS NOT NULL;

