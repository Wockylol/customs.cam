-- Add function to handle new client notifications
-- This sends notifications to all team members when a new client is added

CREATE OR REPLACE FUNCTION notify_new_client()
RETURNS TRIGGER AS $$
DECLARE
  v_team_member_ids UUID[];
  v_notification_id UUID;
  v_created_by_id UUID;
BEGIN
  -- Try to get the current user's team member ID from app metadata
  -- This will be null if the insertion happens outside of an authenticated session
  v_created_by_id := current_setting('app.current_user_id', true)::UUID;

  -- Get all active team members
  SELECT ARRAY_AGG(id) INTO v_team_member_ids
  FROM team_members
  WHERE is_active = true
    AND (v_created_by_id IS NULL OR id != v_created_by_id);

  -- Exit if no team members to notify
  IF v_team_member_ids IS NULL OR array_length(v_team_member_ids, 1) = 0 THEN
    RETURN NEW;
  END IF;

  -- Create the notification
  INSERT INTO notifications (
    type,
    title,
    message,
    link,
    related_entity_type,
    related_entity_id,
    created_by
  ) VALUES (
    'client_added',
    'New Client Added',
    'A new client "' || NEW.username || '" has been added to the system',
    '/client-profile/' || NEW.id::TEXT,
    'client',
    NEW.id::TEXT,
    v_created_by_id
  ) RETURNING id INTO v_notification_id;

  -- Create recipient records for all team members
  INSERT INTO notification_recipients (notification_id, team_member_id)
  SELECT v_notification_id, unnest(v_team_member_ids);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't prevent the client from being created
    RAISE WARNING 'Error creating new client notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_notify_new_client ON clients;

CREATE TRIGGER trigger_notify_new_client
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_client();

-- Add comment
COMMENT ON FUNCTION notify_new_client() IS 
  'Automatically creates notifications for all team members when a new client is added to the system.';

