-- Add 'archived' status to client_scene_assignments
ALTER TABLE public.client_scene_assignments 
DROP CONSTRAINT IF EXISTS client_scene_assignments_status_check;

ALTER TABLE public.client_scene_assignments 
ADD CONSTRAINT client_scene_assignments_status_check 
CHECK (status IN ('pending', 'completed', 'archived'));

-- Add archived_at timestamp column for tracking
ALTER TABLE public.client_scene_assignments 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

