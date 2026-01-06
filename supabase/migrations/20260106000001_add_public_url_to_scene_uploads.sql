-- Add public_url column to scene_content_uploads for R2 storage URLs
-- This stores the public download URL from Cloudflare R2

ALTER TABLE scene_content_uploads
ADD COLUMN IF NOT EXISTS public_url TEXT;

-- Add uploaded_at column (alias for upload_date for consistency)
-- Some code expects uploaded_at instead of upload_date
ALTER TABLE scene_content_uploads
ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill uploaded_at from upload_date for existing records
UPDATE scene_content_uploads SET uploaded_at = upload_date WHERE uploaded_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN scene_content_uploads.public_url IS 'Public download URL for files stored in Cloudflare R2. NULL for legacy Supabase storage files.';

