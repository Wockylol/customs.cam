-- Enable real-time updates for notifications tables
-- This ensures notifications appear immediately without page refresh

-- Enable realtime on notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Enable realtime on notification_recipients table
ALTER PUBLICATION supabase_realtime ADD TABLE notification_recipients;

-- Add comment
COMMENT ON TABLE notification_recipients IS 
  'Notification recipients with realtime enabled for instant updates';

COMMENT ON TABLE notifications IS 
  'Notifications with realtime enabled for instant updates';

