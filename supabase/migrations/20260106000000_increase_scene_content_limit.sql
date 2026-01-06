-- Increase file size limit for scene-content bucket to support large video uploads (5GB)
-- This is needed for clients uploading high-quality video content

UPDATE storage.buckets 
SET file_size_limit = 5368709120  -- 5GB in bytes
WHERE id = 'scene-content';

-- Also update scene-examples in case large example videos are needed
UPDATE storage.buckets 
SET file_size_limit = 5368709120  -- 5GB in bytes
WHERE id = 'scene-examples';

-- Add comment for documentation
COMMENT ON TABLE storage.buckets IS 'scene-content and scene-examples buckets support up to 5GB file uploads for video content';

