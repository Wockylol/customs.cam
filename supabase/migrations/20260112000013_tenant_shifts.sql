-- ============================================================================
-- Dynamic Shift Schedules for Multi-Tenant Support
-- ============================================================================
-- This migration creates the tenant_shifts table to allow each tenant/agency
-- to define their own shift schedules instead of using hardcoded values.
-- ============================================================================

-- Create tenant_shifts table
CREATE TABLE IF NOT EXISTS tenant_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant_agencies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,           -- Display name: "Day Shift", "Evening Shift"
  slug VARCHAR(50) NOT NULL,            -- Unique identifier: "day", "evening", "10-6"
  start_time TIME NOT NULL,             -- Shift start time: "10:00:00"
  end_time TIME NOT NULL,               -- Shift end time: "18:00:00"
  color VARCHAR(20) DEFAULT 'blue',     -- UI color: "blue", "purple", "indigo"
  display_order INT DEFAULT 0,          -- Sort order for UI
  is_active BOOLEAN DEFAULT true,       -- Soft delete flag
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, slug)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenant_shifts_tenant_id ON tenant_shifts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_shifts_active ON tenant_shifts(tenant_id, is_active);

-- Add shift_id column to team_members (nullable for backward compatibility)
ALTER TABLE team_members 
ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES tenant_shifts(id) ON DELETE SET NULL;

-- Create index for the new FK
CREATE INDEX IF NOT EXISTS idx_team_members_shift_id ON team_members(shift_id);

-- ============================================================================
-- Row Level Security (RLS) for tenant_shifts
-- ============================================================================

ALTER TABLE tenant_shifts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view shifts for their own tenant
CREATE POLICY "tenant_shifts_select_policy" ON tenant_shifts
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM team_members WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM platform_admins WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Policy: Admins and owners can insert shifts for their tenant
CREATE POLICY "tenant_shifts_insert_policy" ON tenant_shifts
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM team_members 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM platform_admins WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Policy: Admins and owners can update shifts for their tenant
CREATE POLICY "tenant_shifts_update_policy" ON tenant_shifts
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM team_members 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM platform_admins WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Policy: Admins and owners can delete shifts for their tenant
CREATE POLICY "tenant_shifts_delete_policy" ON tenant_shifts
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM team_members 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM platform_admins WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- ============================================================================
-- Helper function to migrate existing shift text values to shift_id
-- ============================================================================
-- This function can be called to migrate a tenant's existing shift values
-- after they have created their shift definitions.

CREATE OR REPLACE FUNCTION migrate_team_member_shifts(p_tenant_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  migrated_count INTEGER := 0;
BEGIN
  -- Update team members with matching shift slugs
  UPDATE team_members tm
  SET shift_id = ts.id
  FROM tenant_shifts ts
  WHERE tm.tenant_id = p_tenant_id
    AND ts.tenant_id = p_tenant_id
    AND tm.shift IS NOT NULL
    AND tm.shift = ts.slug
    AND tm.shift_id IS NULL;
  
  GET DIAGNOSTICS migrated_count = ROW_COUNT;
  
  RETURN migrated_count;
END;
$$;

-- ============================================================================
-- Trigger for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_tenant_shifts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenant_shifts_updated_at
  BEFORE UPDATE ON tenant_shifts
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_shifts_updated_at();

-- ============================================================================
-- Enable Realtime for tenant_shifts (optional, for live updates)
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE tenant_shifts;

COMMENT ON TABLE tenant_shifts IS 'Stores configurable shift schedules per tenant. Each tenant can define their own shifts with custom times.';
COMMENT ON COLUMN tenant_shifts.slug IS 'Unique identifier within tenant. Used for filtering and stored in team_members.shift for backward compatibility.';
COMMENT ON COLUMN tenant_shifts.start_time IS 'Shift start time in 24-hour format. For overnight shifts, end_time will be less than start_time.';
COMMENT ON COLUMN tenant_shifts.end_time IS 'Shift end time in 24-hour format. For overnight shifts (e.g., 6pm-2am), this will be less than start_time.';

