-- Add function to handle thread message notifications with smart batching
-- This prevents notification spam by batching messages within a time window

CREATE OR REPLACE FUNCTION notify_thread_message()
RETURNS TRIGGER AS $$
DECLARE
  v_thread_name TEXT;
  v_notification_id UUID;
  v_admin_ids UUID[];
  v_message_count INT;
  v_window_start TIMESTAMP;
  v_message_preview TEXT;
BEGIN
  -- Get thread name (or use a default)
  SELECT COALESCE(name, 'Chat Thread') INTO v_thread_name
  FROM threads
  WHERE id = NEW.thread_id;

  -- Get all active admins
  SELECT ARRAY_AGG(id) INTO v_admin_ids
  FROM team_members
  WHERE role = 'admin' AND is_active = true;

  -- Exit if no admins to notify
  IF v_admin_ids IS NULL OR array_length(v_admin_ids, 1) = 0 THEN
    RETURN NEW;
  END IF;

  -- Set notification window (5 minutes)
  v_window_start := NOW() - INTERVAL '5 minutes';

  -- Prepare message preview (first 100 characters)
  v_message_preview := COALESCE(
    substring(NEW.text from 1 for 100),
    substring(NEW.speech_text from 1 for 100),
    'New message'
  );

  -- Check for recent unread notification for this thread
  SELECT n.id INTO v_notification_id
  FROM notifications n
  WHERE n.type = 'thread_message'
    AND n.related_entity_type = 'thread'
    AND n.related_entity_id = NEW.thread_id::TEXT
    AND n.created_at >= v_window_start
    AND EXISTS (
      SELECT 1 FROM notification_recipients nr
      WHERE nr.notification_id = n.id
        AND nr.is_read = false
    )
  ORDER BY n.created_at DESC
  LIMIT 1;

  IF v_notification_id IS NOT NULL THEN
    -- Update existing notification
    -- Count messages since notification was created
    SELECT COUNT(*) INTO v_message_count
    FROM messages
    WHERE thread_id = NEW.thread_id
      AND created_at >= (
        SELECT created_at FROM notifications WHERE id = v_notification_id
      );

    UPDATE notifications
    SET 
      title = CASE 
        WHEN v_message_count > 1 THEN v_message_count || ' New Messages in ' || v_thread_name
        ELSE 'New Message in ' || v_thread_name
      END,
      message = 'Latest: "' || v_message_preview || 
                CASE WHEN length(COALESCE(NEW.text, NEW.speech_text, '')) > 100 THEN '..."' ELSE '"' END,
      updated_at = NOW()
    WHERE id = v_notification_id;

  ELSE
    -- Create new notification
    INSERT INTO notifications (
      type,
      title,
      message,
      link,
      related_entity_type,
      related_entity_id,
      created_by
    ) VALUES (
      'thread_message',
      'New Message in ' || v_thread_name,
      '"' || v_message_preview || 
        CASE WHEN length(COALESCE(NEW.text, NEW.speech_text, '')) > 100 THEN '..."' ELSE '"' END,
      '/chats',
      'thread',
      NEW.thread_id::TEXT,
      NULL
    ) RETURNING id INTO v_notification_id;

    -- Create recipient records for all admins
    INSERT INTO notification_recipients (notification_id, team_member_id)
    SELECT v_notification_id, unnest(v_admin_ids);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_notify_thread_message ON messages;

CREATE TRIGGER trigger_notify_thread_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_thread_message();

-- Create index for faster notification lookups
CREATE INDEX IF NOT EXISTS idx_notifications_thread_lookup 
  ON notifications(type, related_entity_type, related_entity_id, created_at DESC)
  WHERE type = 'thread_message';

-- Add comment
COMMENT ON FUNCTION notify_thread_message() IS 
  'Automatically creates or updates notifications for new thread messages. 
   Batches messages within a 5-minute window to prevent notification spam.';

