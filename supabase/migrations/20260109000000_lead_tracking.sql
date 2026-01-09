-- Lead Tracking System Migration
-- Adds CRM-style lead tracking with pipeline stages and activity logging

-- Create client status enum
DO $$ BEGIN
    CREATE TYPE client_status AS ENUM (
        'lead',           -- Initial lead discovery
        'prospect',       -- Filled out intake form
        'pending_contract', -- In contract negotiation
        'active',         -- Active client
        'inactive',       -- Temporarily inactive
        'churned'         -- No longer a client
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create lead activity type enum
DO $$ BEGIN
    CREATE TYPE lead_activity_type AS ENUM (
        'lead_discovered',
        'form_sent',
        'form_completed',
        'call_scheduled',
        'call_completed',
        'contract_sent',
        'contract_signed',
        'portal_accessed',
        'status_changed',
        'note_added'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS status client_status DEFAULT 'active',
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS lead_source text,
ADD COLUMN IF NOT EXISTS intake_token text UNIQUE,
ADD COLUMN IF NOT EXISTS intake_completed_at timestamptz;

-- Create index on intake_token for fast lookups
CREATE INDEX IF NOT EXISTS idx_clients_intake_token ON clients(intake_token) WHERE intake_token IS NOT NULL;

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

-- Create lead_activities table
CREATE TABLE IF NOT EXISTS lead_activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    activity_type lead_activity_type NOT NULL,
    notes text,
    scheduled_at timestamptz,
    completed_at timestamptz,
    metadata jsonb DEFAULT '{}',
    created_by uuid REFERENCES team_members(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

-- Create indexes for lead_activities
CREATE INDEX IF NOT EXISTS idx_lead_activities_client_id ON lead_activities(client_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_type ON lead_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON lead_activities(created_at DESC);

-- Create platform_interests table (for prospects before they become active)
CREATE TABLE IF NOT EXISTS platform_interests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    platform_id uuid NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
    notes text,
    created_at timestamptz DEFAULT now(),
    UNIQUE(client_id, platform_id)
);

-- Create index for platform_interests
CREATE INDEX IF NOT EXISTS idx_platform_interests_client_id ON platform_interests(client_id);

-- Enable RLS on new tables
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_interests ENABLE ROW LEVEL SECURITY;

-- RLS policies for lead_activities
CREATE POLICY "Team members can view lead activities"
    ON lead_activities FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Team members can insert lead activities"
    ON lead_activities FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Team members can update lead activities"
    ON lead_activities FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Team members can delete lead activities"
    ON lead_activities FOR DELETE
    TO authenticated
    USING (true);

-- RLS policies for platform_interests
CREATE POLICY "Anyone can view platform interests"
    ON platform_interests FOR SELECT
    USING (true);

CREATE POLICY "Anyone can insert platform interests"
    ON platform_interests FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Team members can update platform interests"
    ON platform_interests FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Team members can delete platform interests"
    ON platform_interests FOR DELETE
    TO authenticated
    USING (true);

-- Function to generate unique intake token
CREATE OR REPLACE FUNCTION generate_intake_token()
RETURNS text AS $$
DECLARE
    chars text := 'abcdefghijklmnopqrstuvwxyz0123456789';
    result text := '';
    i integer;
BEGIN
    FOR i IN 1..12 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to create a new lead with intake token
CREATE OR REPLACE FUNCTION create_lead_with_token(
    p_first_name text DEFAULT NULL,
    p_last_name text DEFAULT NULL,
    p_email text DEFAULT NULL,
    p_phone text DEFAULT NULL,
    p_lead_source text DEFAULT NULL,
    p_created_by uuid DEFAULT NULL
)
RETURNS TABLE(client_id uuid, intake_token text) AS $$
DECLARE
    v_token text;
    v_client_id uuid;
    v_username text;
BEGIN
    -- Generate unique token
    LOOP
        v_token := generate_intake_token();
        EXIT WHEN NOT EXISTS (SELECT 1 FROM clients WHERE clients.intake_token = v_token);
    END LOOP;
    
    -- Generate temporary username from token
    v_username := 'lead_' || v_token;
    
    -- Insert new lead
    INSERT INTO clients (
        username,
        first_name,
        last_name,
        email,
        phone,
        status,
        lead_source,
        intake_token,
        is_active
    ) VALUES (
        v_username,
        p_first_name,
        p_last_name,
        p_email,
        p_phone,
        'lead',
        p_lead_source,
        v_token,
        true
    ) RETURNING id INTO v_client_id;
    
    -- Log the activity
    INSERT INTO lead_activities (client_id, activity_type, created_by)
    VALUES (v_client_id, 'lead_discovered', p_created_by);
    
    RETURN QUERY SELECT v_client_id, v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete intake form (called when prospect submits form)
CREATE OR REPLACE FUNCTION complete_intake_form(
    p_token text DEFAULT NULL,
    p_first_name text DEFAULT NULL,
    p_last_name text DEFAULT NULL,
    p_email text DEFAULT NULL,
    p_phone text DEFAULT NULL,
    p_username text DEFAULT NULL,
    p_platform_ids uuid[] DEFAULT NULL
)
RETURNS TABLE(client_id uuid, username text, success boolean, message text) AS $$
DECLARE
    v_client_id uuid;
    v_existing_client_id uuid;
    v_platform_id uuid;
BEGIN
    -- Check if username already exists
    SELECT id INTO v_existing_client_id FROM clients WHERE clients.username = p_username;
    IF v_existing_client_id IS NOT NULL THEN
        RETURN QUERY SELECT NULL::uuid, p_username, false, 'Username already taken'::text;
        RETURN;
    END IF;
    
    -- If token provided, update existing lead
    IF p_token IS NOT NULL THEN
        SELECT id INTO v_client_id FROM clients WHERE intake_token = p_token;
        
        IF v_client_id IS NOT NULL THEN
            UPDATE clients SET
                username = COALESCE(p_username, username),
                first_name = COALESCE(p_first_name, first_name),
                last_name = COALESCE(p_last_name, last_name),
                email = COALESCE(p_email, email),
                phone = COALESCE(p_phone, phone),
                status = 'prospect',
                intake_completed_at = now()
            WHERE id = v_client_id;
        END IF;
    END IF;
    
    -- If no token or token not found, create new prospect
    IF v_client_id IS NULL THEN
        INSERT INTO clients (
            username,
            first_name,
            last_name,
            email,
            phone,
            status,
            intake_completed_at,
            is_active
        ) VALUES (
            p_username,
            p_first_name,
            p_last_name,
            p_email,
            p_phone,
            'prospect',
            now(),
            true
        ) RETURNING id INTO v_client_id;
        
        -- Log lead discovered for new entries
        INSERT INTO lead_activities (client_id, activity_type)
        VALUES (v_client_id, 'lead_discovered');
    END IF;
    
    -- Log form completion
    INSERT INTO lead_activities (client_id, activity_type)
    VALUES (v_client_id, 'form_completed');
    
    -- Add platform interests
    IF p_platform_ids IS NOT NULL THEN
        FOREACH v_platform_id IN ARRAY p_platform_ids LOOP
            INSERT INTO platform_interests (client_id, platform_id)
            VALUES (v_client_id, v_platform_id)
            ON CONFLICT (client_id, platform_id) DO NOTHING;
        END LOOP;
    END IF;
    
    -- Also sync to client_personal_info
    INSERT INTO client_personal_info (client_id, legal_name, email, phone)
    VALUES (
        v_client_id,
        CONCAT(p_first_name, ' ', p_last_name),
        p_email,
        p_phone
    )
    ON CONFLICT (client_id) DO UPDATE SET
        legal_name = EXCLUDED.legal_name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone;
    
    RETURN QUERY SELECT v_client_id, p_username, true, 'Intake form completed successfully'::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update client status with activity logging
CREATE OR REPLACE FUNCTION update_client_status(
    p_client_id uuid,
    p_new_status client_status,
    p_notes text DEFAULT NULL,
    p_updated_by uuid DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
    v_old_status client_status;
BEGIN
    SELECT status INTO v_old_status FROM clients WHERE id = p_client_id;
    
    IF v_old_status IS NULL THEN
        RETURN false;
    END IF;
    
    UPDATE clients SET status = p_new_status WHERE id = p_client_id;
    
    INSERT INTO lead_activities (
        client_id,
        activity_type,
        notes,
        metadata,
        created_by
    ) VALUES (
        p_client_id,
        'status_changed',
        p_notes,
        jsonb_build_object('old_status', v_old_status::text, 'new_status', p_new_status::text),
        p_updated_by
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log lead activity
CREATE OR REPLACE FUNCTION log_lead_activity(
    p_client_id uuid,
    p_activity_type lead_activity_type,
    p_notes text DEFAULT NULL,
    p_scheduled_at timestamptz DEFAULT NULL,
    p_metadata jsonb DEFAULT '{}',
    p_created_by uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
    v_activity_id uuid;
BEGIN
    INSERT INTO lead_activities (
        client_id,
        activity_type,
        notes,
        scheduled_at,
        metadata,
        created_by
    ) VALUES (
        p_client_id,
        p_activity_type,
        p_notes,
        p_scheduled_at,
        p_metadata,
        p_created_by
    ) RETURNING id INTO v_activity_id;
    
    RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing clients to have 'active' status if not set
UPDATE clients SET status = 'active' WHERE status IS NULL;

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE lead_activities;
ALTER PUBLICATION supabase_realtime ADD TABLE platform_interests;

