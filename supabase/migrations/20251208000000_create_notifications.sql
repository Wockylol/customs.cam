-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  related_entity_type TEXT,
  related_entity_id UUID,
  created_by UUID REFERENCES team_members(id) ON DELETE SET NULL
);

-- Create notification_recipients table for many-to-many relationship
CREATE TABLE IF NOT EXISTS notification_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(notification_id, team_member_id)
);

-- Create client_notes table if it doesn't exist
CREATE TABLE IF NOT EXISTS client_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notification_recipients_team_member ON notification_recipients(team_member_id);
CREATE INDEX IF NOT EXISTS idx_notification_recipients_is_read ON notification_recipients(is_read);
CREATE INDEX IF NOT EXISTS idx_notification_recipients_notification ON notification_recipients(notification_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_client_id ON client_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_created_at ON client_notes(created_at DESC);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_notes ENABLE ROW LEVEL SECURITY;

-- Policies for notifications (drop if exists to avoid duplicates)
DROP POLICY IF EXISTS "Team members can view notifications they received" ON notifications;
CREATE POLICY "Team members can view notifications they received"
  ON notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notification_recipients nr
      WHERE nr.notification_id = notifications.id
      AND nr.team_member_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins and managers can create notifications" ON notifications;
CREATE POLICY "Admins and managers can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Users can update their own notification status" ON notifications;
CREATE POLICY "Users can update their own notification status"
  ON notifications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM notification_recipients nr
      WHERE nr.notification_id = notifications.id
      AND nr.team_member_id = auth.uid()
    )
  );

-- Policies for notification_recipients (drop if exists to avoid duplicates)
DROP POLICY IF EXISTS "Team members can view their notification receipts" ON notification_recipients;
CREATE POLICY "Team members can view their notification receipts"
  ON notification_recipients FOR SELECT
  USING (team_member_id = auth.uid());

DROP POLICY IF EXISTS "Admins and managers can create notification receipts" ON notification_recipients;
CREATE POLICY "Admins and managers can create notification receipts"
  ON notification_recipients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Users can update their own notification receipt status" ON notification_recipients;
CREATE POLICY "Users can update their own notification receipt status"
  ON notification_recipients FOR UPDATE
  USING (team_member_id = auth.uid());

-- Policies for client_notes (drop if exists to avoid duplicates)
DROP POLICY IF EXISTS "Team members can view client notes" ON client_notes;
CREATE POLICY "Team members can view client notes"
  ON client_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Team members can create client notes" ON client_notes;
CREATE POLICY "Team members can create client notes"
  ON client_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own notes" ON client_notes;
CREATE POLICY "Users can update their own notes"
  ON client_notes FOR UPDATE
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Admins can delete any notes" ON client_notes;
CREATE POLICY "Admins can delete any notes"
  ON client_notes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at (drop if exists to avoid duplicates)
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_notes_updated_at ON client_notes;
CREATE TRIGGER update_client_notes_updated_at
  BEFORE UPDATE ON client_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

