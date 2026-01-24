-- Fix: Intake links should associate clients with the tenant that generated them
-- This migration updates create_lead_with_token to accept and store tenant_id
-- and ensures complete_intake_form preserves the tenant_id

-- Drop and recreate create_lead_with_token to include tenant_id parameter
DROP FUNCTION IF EXISTS create_lead_with_token(text, text, text, text, text, uuid);

CREATE OR REPLACE FUNCTION create_lead_with_token(
    p_first_name text DEFAULT NULL,
    p_last_name text DEFAULT NULL,
    p_email text DEFAULT NULL,
    p_phone text DEFAULT NULL,
    p_lead_source text DEFAULT NULL,
    p_created_by uuid DEFAULT NULL,
    p_tenant_id uuid DEFAULT NULL
)
RETURNS TABLE(client_id uuid, intake_token text) AS $$
DECLARE
    v_token text;
    v_client_id uuid;
    v_username text;
    v_tenant_id uuid;
BEGIN
    -- Determine tenant_id: use parameter if provided, otherwise try to get from current user
    v_tenant_id := p_tenant_id;
    
    IF v_tenant_id IS NULL AND p_created_by IS NOT NULL THEN
        -- Try to get tenant_id from the team member who created this lead
        SELECT tm.tenant_id INTO v_tenant_id
        FROM team_members tm
        WHERE tm.id = p_created_by;
    END IF;
    
    -- Generate unique token
    LOOP
        v_token := generate_intake_token();
        EXIT WHEN NOT EXISTS (SELECT 1 FROM clients WHERE clients.intake_token = v_token);
    END LOOP;
    
    -- Generate temporary username from token
    v_username := 'lead_' || v_token;
    
    -- Insert new lead with tenant_id
    INSERT INTO clients (
        username,
        first_name,
        last_name,
        email,
        phone,
        status,
        lead_source,
        intake_token,
        is_active,
        tenant_id
    ) VALUES (
        v_username,
        p_first_name,
        p_last_name,
        p_email,
        p_phone,
        'lead',
        p_lead_source,
        v_token,
        true,
        v_tenant_id
    ) RETURNING id INTO v_client_id;
    
    -- Log the activity
    INSERT INTO lead_activities (client_id, activity_type, created_by)
    VALUES (v_client_id, 'lead_discovered', p_created_by);
    
    RETURN QUERY SELECT v_client_id, v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update complete_intake_form to preserve tenant_id when updating existing lead
-- and to accept tenant_id for new prospects (in case intake is done without a token)
DROP FUNCTION IF EXISTS complete_intake_form(text, text, text, text, text, text, uuid[]);

CREATE OR REPLACE FUNCTION complete_intake_form(
    p_token text DEFAULT NULL,
    p_first_name text DEFAULT NULL,
    p_last_name text DEFAULT NULL,
    p_email text DEFAULT NULL,
    p_phone text DEFAULT NULL,
    p_username text DEFAULT NULL,
    p_platform_ids uuid[] DEFAULT NULL
)
RETURNS TABLE(out_client_id uuid, out_username text, out_success boolean, out_message text) AS $$
DECLARE
    v_client_id uuid;
    v_existing_client_id uuid;
    v_platform_id uuid;
    v_tenant_id uuid;
BEGIN
    -- Check if username already exists
    SELECT c.id INTO v_existing_client_id FROM clients c WHERE c.username = p_username;
    IF v_existing_client_id IS NOT NULL THEN
        RETURN QUERY SELECT NULL::uuid, p_username, false, 'Username already taken'::text;
        RETURN;
    END IF;
    
    -- If token provided, update existing lead
    IF p_token IS NOT NULL THEN
        SELECT c.id, c.tenant_id INTO v_client_id, v_tenant_id 
        FROM clients c 
        WHERE c.intake_token = p_token;
        
        IF v_client_id IS NOT NULL THEN
            -- Update the client, preserving the tenant_id that was set when the link was generated
            UPDATE clients SET
                username = COALESCE(p_username, clients.username),
                first_name = COALESCE(p_first_name, clients.first_name),
                last_name = COALESCE(p_last_name, clients.last_name),
                email = COALESCE(p_email, clients.email),
                phone = COALESCE(p_phone, clients.phone),
                status = 'prospect',
                intake_completed_at = now()
                -- tenant_id is intentionally NOT updated - it was set when the link was created
            WHERE clients.id = v_client_id;
        END IF;
    END IF;
    
    -- If no token or token not found, create new prospect (without tenant association)
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_lead_with_token TO authenticated;
GRANT EXECUTE ON FUNCTION complete_intake_form TO anon, authenticated;

COMMENT ON FUNCTION create_lead_with_token IS 'Creates a new lead with an intake token, associating them with the tenant of the team member who created the link';
COMMENT ON FUNCTION complete_intake_form IS 'Completes the intake form for a prospect, preserving any tenant association from the intake link';

