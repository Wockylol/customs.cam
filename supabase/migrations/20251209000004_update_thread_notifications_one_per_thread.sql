-- Update thread notification function to maintain ONE notification per thread
-- This replaces the time-window batching with a cleaner "one notification per thread" approach

CREATE OR REPLACE FUNCTION notify_thread_message()
RETURNS TRIGGER AS $$
DECLARE
  v_thread_name TEXT;
  v_notification_id UUID;
  v_admin_ids UUID[];
  v_message_count INT;
  v_message_preview TEXT;
  v_unread_count INT;
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

  -- Prepare message preview (first 100 characters)
  v_message_preview := COALESCE(
    substring(NEW.text from 1 for 100),
    substring(NEW.speech_text from 1 for 100),
    'New message'
  );

  -- Check for ANY existing notification for this thread (no time or read status filter)
  -- We want exactly ONE notification per thread, always
  SELECT n.id INTO v_notification_id
  FROM notifications n
  WHERE n.type = 'thread_message'
    AND n.related_entity_type = 'thread'
    AND n.related_entity_id = NEW.thread_id::TEXT
  ORDER BY n.created_at DESC
  LIMIT 1;

  IF v_notification_id IS NOT NULL THEN
    -- Update existing notification
    -- Count total unread messages in this thread
    SELECT COUNT(*) INTO v_unread_count
    FROM messages
    WHERE thread_id = NEW.thread_id
      AND created_at > COALESCE(
        (SELECT last_read_at FROM threads WHERE id = NEW.thread_id),
        '1970-01-01'::timestamp
      );

    -- Update the notification with latest message and count
    UPDATE notifications
    SET 
      title = CASE 
        WHEN v_unread_count > 1 THEN v_unread_count || ' New Messages in ' || v_thread_name
        ELSE 'New Message in ' || v_thread_name
      END,
      message = 'Latest: "' || v_message_preview || 
                CASE WHEN length(COALESCE(NEW.text, NEW.speech_text, '')) > 100 THEN '..."' ELSE '"' END,
      updated_at = NOW()
    WHERE id = v_notification_id;

    -- Mark all recipient records as unread (in case they were previously read)
    UPDATE notification_recipients
    SET is_read = false, read_at = NULL
    WHERE notification_id = v_notification_id;

  ELSE
    -- Create new notification (first message in this thread)
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

-- The trigger already exists from the previous migration, no need to recreate it

-- Add comment
COMMENT ON FUNCTION notify_thread_message() IS 
  'Maintains exactly ONE notification per thread. Updates existing notification with latest message and unread count when new messages arrive.';

