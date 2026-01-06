-- SMS Conversations and Messages tables for Twilio two-way SMS
-- This creates a separate messaging system from the LoopMessage threads

-- Create sms_conversations table
CREATE TABLE IF NOT EXISTS sms_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT sms_conversations_phone_number_unique UNIQUE (phone_number)
);

-- Create index on phone_number for quick lookups
CREATE INDEX IF NOT EXISTS idx_sms_conversations_phone_number ON sms_conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_conversations_client_id ON sms_conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_sms_conversations_last_message_at ON sms_conversations(last_message_at DESC);

-- Create sms_messages table
CREATE TABLE IF NOT EXISTS sms_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES sms_conversations(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    body TEXT NOT NULL,
    twilio_sid TEXT,
    status TEXT DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'undelivered', 'received')),
    sent_by UUID REFERENCES team_members(id) ON DELETE SET NULL,
    error_code TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for sms_messages
CREATE INDEX IF NOT EXISTS idx_sms_messages_conversation_id ON sms_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_created_at ON sms_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_messages_twilio_sid ON sms_messages(twilio_sid);
CREATE INDEX IF NOT EXISTS idx_sms_messages_direction ON sms_messages(direction);

-- Function to update last_message_at on conversation when new message is inserted
CREATE OR REPLACE FUNCTION update_sms_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE sms_conversations
    SET last_message_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation timestamp on new message
DROP TRIGGER IF EXISTS trigger_update_sms_conversation_last_message ON sms_messages;
CREATE TRIGGER trigger_update_sms_conversation_last_message
    AFTER INSERT ON sms_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_sms_conversation_last_message();

-- Enable RLS
ALTER TABLE sms_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sms_conversations
-- Allow authenticated users to read all conversations
CREATE POLICY "Allow authenticated users to read sms_conversations"
    ON sms_conversations
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert conversations
CREATE POLICY "Allow authenticated users to insert sms_conversations"
    ON sms_conversations
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update conversations
CREATE POLICY "Allow authenticated users to update sms_conversations"
    ON sms_conversations
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- RLS Policies for sms_messages
-- Allow authenticated users to read all messages
CREATE POLICY "Allow authenticated users to read sms_messages"
    ON sms_messages
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert messages
CREATE POLICY "Allow authenticated users to insert sms_messages"
    ON sms_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update messages (for status updates)
CREATE POLICY "Allow authenticated users to update sms_messages"
    ON sms_messages
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow service role full access (for Edge Functions)
CREATE POLICY "Allow service role full access to sms_conversations"
    ON sms_conversations
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow service role full access to sms_messages"
    ON sms_messages
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT ALL ON sms_conversations TO authenticated;
GRANT ALL ON sms_messages TO authenticated;
GRANT ALL ON sms_conversations TO service_role;
GRANT ALL ON sms_messages TO service_role;

