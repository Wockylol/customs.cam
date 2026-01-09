-- Fix: Rename return columns to avoid ambiguity with table columns
-- This fixes the "column reference client_id is ambiguous" error

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
BEGIN
    -- Check if username already exists
    SELECT c.id INTO v_existing_client_id FROM clients c WHERE c.username = p_username;
    IF v_existing_client_id IS NOT NULL THEN
        RETURN QUERY SELECT NULL::uuid, p_username, false, 'Username already taken'::text;
        RETURN;
    END IF;
    
    -- If token provided, update existing lead
    IF p_token IS NOT NULL THEN
        SELECT c.id INTO v_client_id FROM clients c WHERE c.intake_token = p_token;
        
        IF v_client_id IS NOT NULL THEN
            UPDATE clients SET
                username = COALESCE(p_username, clients.username),
                first_name = COALESCE(p_first_name, clients.first_name),
                last_name = COALESCE(p_last_name, clients.last_name),
                email = COALESCE(p_email, clients.email),
                phone = COALESCE(p_phone, clients.phone),
                status = 'prospect',
                intake_completed_at = now()
            WHERE clients.id = v_client_id;
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

