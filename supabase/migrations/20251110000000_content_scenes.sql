-- Create content_scenes table
CREATE TABLE IF NOT EXISTS public.content_scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    location TEXT,
    props TEXT,
    instructions JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_template BOOLEAN NOT NULL DEFAULT true,
    is_default_for_new_clients BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create client_scene_assignments table
CREATE TABLE IF NOT EXISTS public.client_scene_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    scene_id UUID NOT NULL REFERENCES public.content_scenes(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    assigned_by UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(client_id, scene_id)
);

-- Create scene_content_uploads table
CREATE TABLE IF NOT EXISTS public.scene_content_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.client_scene_assignments(id) ON DELETE CASCADE,
    step_index INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    upload_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create scene_example_media table
CREATE TABLE IF NOT EXISTS public.scene_example_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id UUID NOT NULL REFERENCES public.content_scenes(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_content_scenes_template ON public.content_scenes(is_template);
CREATE INDEX IF NOT EXISTS idx_content_scenes_default ON public.content_scenes(is_default_for_new_clients);
CREATE INDEX IF NOT EXISTS idx_client_scene_assignments_client ON public.client_scene_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_scene_assignments_scene ON public.client_scene_assignments(scene_id);
CREATE INDEX IF NOT EXISTS idx_client_scene_assignments_status ON public.client_scene_assignments(status);
CREATE INDEX IF NOT EXISTS idx_scene_content_uploads_assignment ON public.scene_content_uploads(assignment_id);
CREATE INDEX IF NOT EXISTS idx_scene_content_uploads_step ON public.scene_content_uploads(assignment_id, step_index);
CREATE INDEX IF NOT EXISTS idx_scene_example_media_scene ON public.scene_example_media(scene_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_content_scenes_updated_at BEFORE UPDATE ON public.content_scenes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_scene_assignments_updated_at BEFORE UPDATE ON public.client_scene_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.content_scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_scene_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scene_content_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scene_example_media ENABLE ROW LEVEL SECURITY;

-- RLS Policies for content_scenes
-- Admins and managers can do everything, all authenticated users can read
CREATE POLICY "Admins and managers can manage scenes"
    ON public.content_scenes
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.id = auth.uid()
            AND team_members.role IN ('admin', 'manager')
            AND team_members.is_active = true
        )
    );

CREATE POLICY "All authenticated users can view scenes"
    ON public.content_scenes
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- RLS Policies for client_scene_assignments
-- Admins and managers can manage all assignments
CREATE POLICY "Admins and managers can manage scene assignments"
    ON public.client_scene_assignments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.id = auth.uid()
            AND team_members.role IN ('admin', 'manager')
            AND team_members.is_active = true
        )
    );

-- Clients can view their own assignments
CREATE POLICY "Clients can view their own scene assignments"
    ON public.client_scene_assignments
    FOR SELECT
    USING (
        client_id IN (
            SELECT id FROM public.clients WHERE id = auth.uid()
        )
    );

-- Clients can update their own assignments (for marking complete)
CREATE POLICY "Clients can update their own scene assignments"
    ON public.client_scene_assignments
    FOR UPDATE
    USING (
        client_id IN (
            SELECT id FROM public.clients WHERE id = auth.uid()
        )
    );

-- RLS Policies for scene_content_uploads
-- Admins and managers can view all uploads
CREATE POLICY "Admins and managers can view all scene uploads"
    ON public.scene_content_uploads
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.id = auth.uid()
            AND team_members.role IN ('admin', 'manager')
            AND team_members.is_active = true
        )
    );

-- Clients can upload to their own assignments
CREATE POLICY "Clients can upload to their own scene assignments"
    ON public.scene_content_uploads
    FOR INSERT
    WITH CHECK (
        uploaded_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.client_scene_assignments
            WHERE client_scene_assignments.id = assignment_id
            AND client_scene_assignments.client_id = auth.uid()
        )
    );

-- Clients can view their own uploads
CREATE POLICY "Clients can view their own scene uploads"
    ON public.scene_content_uploads
    FOR SELECT
    USING (
        uploaded_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.client_scene_assignments
            WHERE client_scene_assignments.id = assignment_id
            AND client_scene_assignments.client_id = auth.uid()
        )
    );

-- Clients can delete their own uploads
CREATE POLICY "Clients can delete their own scene uploads"
    ON public.scene_content_uploads
    FOR DELETE
    USING (
        uploaded_by = auth.uid()
    );

-- RLS Policies for scene_example_media
-- Admins and managers can manage example media
CREATE POLICY "Admins and managers can manage scene example media"
    ON public.scene_example_media
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.id = auth.uid()
            AND team_members.role IN ('admin', 'manager')
            AND team_members.is_active = true
        )
    );

-- All authenticated users can view example media
CREATE POLICY "All authenticated users can view scene example media"
    ON public.scene_example_media
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Create storage buckets (note: these need to be created via Supabase dashboard or API)
-- This is a reference for the storage structure:
-- Bucket: scene-content
--   Path: {client_id}/{assignment_id}/step_{step_index}/{filename}
-- Bucket: scene-examples
--   Path: {scene_id}/{filename}

