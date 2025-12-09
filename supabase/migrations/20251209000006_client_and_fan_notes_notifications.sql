-- Add notifications for client notes and fan notes
-- Notifies assigned chatters + admins + managers when notes are added/updated

-- ============================================================================
-- HELPER FUNCTION: Get recipients for a client
-- ============================================================================
CREATE OR REPLACE FUNCTION get_client_note_recipients(p_client_id UUID, p_author_id UUID)
RETURNS UUID[] AS $$
DECLARE
  v_recipient_ids UUID[];
BEGIN
  -- Get assigned chatters for this client + all admins and managers
  SELECT ARRAY_AGG(DISTINCT tm.id)
  INTO v_recipient_ids
  FROM team_members tm
  WHERE tm.is_active = true
    AND tm.id != p_author_id  -- Exclude the author
    AND (
      -- Assigned chatters
      EXISTS (
        SELECT 1 FROM chatter_assignments ca
        WHERE ca.client_id = p_client_id
          AND ca.chatter_id = tm.id
          AND ca.is_active = true
      )
      -- OR admins and managers
      OR tm.role IN ('admin', 'manager')
    );
  
  RETURN COALESCE(v_recipient_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CLIENT NOTES TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_client_note_change()
RETURNS TRIGGER AS $$
DECLARE
  v_client_username TEXT;
  v_notification_id UUID;
  v_recipients UUID[];
  v_note_preview TEXT;
  v_action TEXT;
BEGIN
  -- Get client username
  SELECT username INTO v_client_username
  FROM clients
  WHERE id = NEW.client_id;

  -- Determine action (INSERT or UPDATE)
  v_action := CASE 
    WHEN TG_OP = 'INSERT' THEN 'added'
    ELSE 'updated'
  END;

  -- Get note preview (first 100 characters)
  v_note_preview := substring(NEW.content from 1 for 100);
  IF length(NEW.content) > 100 THEN
    v_note_preview := v_note_preview || '...';
  END IF;

  -- Get recipients (assigned chatters + admins + managers, excluding author)
  v_recipients := get_client_note_recipients(NEW.client_id, NEW.author_id);

  -- Exit if no recipients
  IF array_length(v_recipients, 1) IS NULL OR array_length(v_recipients, 1) = 0 THEN
    RETURN NEW;
  END IF;

  -- Create notification
  INSERT INTO notifications (
    type,
    title,
    message,
    link,
    related_entity_type,
    related_entity_id,
    created_by
  ) VALUES (
    'client_note',
    'Client Note ' || initcap(v_action),
    'A note was ' || v_action || ' for @' || v_client_username || ': "' || v_note_preview || '"',
    '/client-profile/' || NEW.client_id::TEXT,
    'client',
    NEW.client_id::TEXT,
    NEW.author_id
  ) RETURNING id INTO v_notification_id;

  -- Create recipient records
  INSERT INTO notification_recipients (notification_id, team_member_id)
  SELECT v_notification_id, unnest(v_recipients);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't prevent note creation
    RAISE WARNING 'Error creating client note notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for client notes (INSERT and UPDATE)
DROP TRIGGER IF EXISTS trigger_notify_client_note ON client_notes;

CREATE TRIGGER trigger_notify_client_note
  AFTER INSERT OR UPDATE ON client_notes
  FOR EACH ROW
  EXECUTE FUNCTION notify_client_note_change();

-- ============================================================================
-- FAN NOTES TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_fan_note_change()
RETURNS TRIGGER AS $$
DECLARE
  v_client_username TEXT;
  v_notification_id UUID;
  v_recipients UUID[];
  v_note_preview TEXT;
  v_action TEXT;
BEGIN
  -- Get client username
  SELECT username INTO v_client_username
  FROM clients
  WHERE id = NEW.client_id;

  -- Determine action (INSERT or UPDATE)
  v_action := CASE 
    WHEN TG_OP = 'INSERT' THEN 'added'
    ELSE 'updated'
  END;

  -- Get note preview (first 100 characters)
  v_note_preview := substring(NEW.content from 1 for 100);
  IF length(NEW.content) > 100 THEN
    v_note_preview := v_note_preview || '...';
  END IF;

  -- Get recipients (assigned chatters + admins + managers, excluding author)
  v_recipients := get_client_note_recipients(NEW.client_id, NEW.author_id);

  -- Exit if no recipients
  IF array_length(v_recipients, 1) IS NULL OR array_length(v_recipients, 1) = 0 THEN
    RETURN NEW;
  END IF;

  -- Create notification
  INSERT INTO notifications (
    type,
    title,
    message,
    link,
    related_entity_type,
    related_entity_id,
    created_by
  ) VALUES (
    'fan_note',
    'Fan Note ' || initcap(v_action),
    'A fan note was ' || v_action || ' for @' || v_client_username || ' (Fan: ' || NEW.fan_name || '): "' || v_note_preview || '"',
    '/client-profile/' || NEW.client_id::TEXT,
    'client',
    NEW.client_id::TEXT,
    NEW.author_id
  ) RETURNING id INTO v_notification_id;

  -- Create recipient records
  INSERT INTO notification_recipients (notification_id, team_member_id)
  SELECT v_notification_id, unnest(v_recipients);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't prevent note creation
    RAISE WARNING 'Error creating fan note notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for fan notes (INSERT and UPDATE)
DROP TRIGGER IF EXISTS trigger_notify_fan_note ON fan_notes;

CREATE TRIGGER trigger_notify_fan_note
  AFTER INSERT OR UPDATE ON fan_notes
  FOR EACH ROW
  EXECUTE FUNCTION notify_fan_note_change();

-- ============================================================================
-- INDEXES
-- ============================================================================
-- These help the notification queries run faster
CREATE INDEX IF NOT EXISTS idx_chatter_assignments_lookup 
  ON chatter_assignments(client_id, chatter_id, is_active);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON FUNCTION get_client_note_recipients(UUID, UUID) IS 
  'Returns array of team member IDs who should be notified about notes for a client (assigned chatters + admins + managers, excluding author)';

COMMENT ON FUNCTION notify_client_note_change() IS 
  'Creates notifications when client notes are added or updated. Notifies assigned chatters, admins, and managers.';

COMMENT ON FUNCTION notify_fan_note_change() IS 
  'Creates notifications when fan notes are added or updated. Notifies assigned chatters, admins, and managers.';

