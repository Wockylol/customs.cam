-- Create an optimized RPC function to fetch threads with their latest messages
-- This eliminates the N+1 query problem by using a single efficient query

CREATE OR REPLACE FUNCTION get_threads_with_latest_messages()
RETURNS TABLE (
  thread_id BIGINT,
  group_id TEXT,
  thread_name TEXT,
  client_id TEXT,
  participants TEXT[],
  thread_created_at TIMESTAMPTZ,
  thread_updated_at TIMESTAMPTZ,
  last_read_at TIMESTAMPTZ,
  latest_message_text TEXT,
  latest_message_speech_text TEXT,
  latest_message_created_at TIMESTAMPTZ,
  latest_message_sender_name TEXT,
  latest_message_sender_phone TEXT
) 
LANGUAGE SQL
STABLE
AS $$
  SELECT 
    t.id as thread_id,
    t.group_id,
    t.name as thread_name,
    t.client_id,
    t.participants,
    t.created_at as thread_created_at,
    t.updated_at as thread_updated_at,
    t.last_read_at,
    m.text as latest_message_text,
    m.speech_text as latest_message_speech_text,
    m.created_at as latest_message_created_at,
    m.sender_name as latest_message_sender_name,
    m.sender_phone_number as latest_message_sender_phone
  FROM threads t
  LEFT JOIN LATERAL (
    SELECT 
      text, 
      speech_text, 
      created_at, 
      sender_name, 
      sender_phone_number
    FROM messages 
    WHERE thread_id = t.id 
    ORDER BY created_at DESC 
    LIMIT 1
  ) m ON true
  ORDER BY 
    COALESCE(m.created_at, t.updated_at) DESC;
$$;

-- Add an index to optimize the messages query within the lateral join
CREATE INDEX IF NOT EXISTS idx_messages_thread_id_created_at 
ON messages (thread_id, created_at DESC);

-- Add an index to optimize thread ordering
CREATE INDEX IF NOT EXISTS idx_threads_updated_at 
ON threads (updated_at DESC);
