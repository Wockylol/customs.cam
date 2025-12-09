-- Add notifications when new users sign up
-- Notifies all admins and managers when a new team member is created with 'pending' status

CREATE OR REPLACE FUNCTION notify_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_manager_ids UUID[];
  v_notification_id UUID;
BEGIN
  -- Only notify for new team members with 'pending' role (new signups)
  IF NEW.role != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Get all active admins and managers
  SELECT ARRAY_AGG(id) INTO v_admin_manager_ids
  FROM team_members
  WHERE is_active = true
    AND role IN ('admin', 'manager')
    AND id != NEW.id;  -- Exclude the new user themselves

  -- Exit if no admins/managers to notify
  IF v_admin_manager_ids IS NULL OR array_length(v_admin_manager_ids, 1) = 0 THEN
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
    'approval_needed',
    'New User Approval Needed',
    NEW.full_name || ' (' || NEW.email || ') has signed up and needs approval',
    '/user-approvals',
    'user',
    NEW.id::TEXT,
    NULL
  ) RETURNING id INTO v_notification_id;

  -- Create recipient records for all admins and managers
  INSERT INTO notification_recipients (notification_id, team_member_id)
  SELECT v_notification_id, unnest(v_admin_manager_ids);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't prevent user signup
    RAISE WARNING 'Error creating user signup notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_notify_new_user_signup ON team_members;

CREATE TRIGGER trigger_notify_new_user_signup
  AFTER INSERT ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_user_signup();

-- Add comment
COMMENT ON FUNCTION notify_new_user_signup() IS 
  'Automatically creates notifications for admins and managers when a new user signs up (team member with pending role created).';

