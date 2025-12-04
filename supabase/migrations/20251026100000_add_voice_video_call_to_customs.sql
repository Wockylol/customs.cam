/*
  # Add Voice/Video Call Fields to Custom Requests
  
  This migration adds support for voice/video call custom requests:
  - Adds `is_voice_video_call` boolean field to track if the request is for a call
  - Adds `call_scheduled_at` timestamptz field for scheduling call date/time
  
  Changes:
  1. Add new columns to custom_requests table
  2. Add index on call_scheduled_at for performance
*/

-- Add voice/video call fields to custom_requests table
ALTER TABLE custom_requests
ADD COLUMN IF NOT EXISTS is_voice_video_call boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS call_scheduled_at timestamptz NULL;

-- Add comment for documentation
COMMENT ON COLUMN custom_requests.is_voice_video_call IS 'Indicates if this custom request is for a voice/video call';
COMMENT ON COLUMN custom_requests.call_scheduled_at IS 'Scheduled date and time for the call (optional)';

-- Create index for filtering and sorting by call schedule
CREATE INDEX IF NOT EXISTS idx_custom_requests_call_scheduled_at 
ON custom_requests(call_scheduled_at) 
WHERE call_scheduled_at IS NOT NULL;

-- Create index for filtering voice/video calls
CREATE INDEX IF NOT EXISTS idx_custom_requests_is_voice_video_call 
ON custom_requests(is_voice_video_call) 
WHERE is_voice_video_call = true;

