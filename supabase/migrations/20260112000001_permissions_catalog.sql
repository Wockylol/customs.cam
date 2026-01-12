-- ============================================================================
-- DYNAMIC ROLES & PERMISSIONS SYSTEM - PHASE 1: PERMISSIONS CATALOG
-- ============================================================================
-- This migration creates the global permissions catalog that defines all
-- available permissions (pages + actions) across the platform.
-- ============================================================================

-- ============================================================================
-- CREATE PERMISSIONS_CATALOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.permissions_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('page_access', 'action')),
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_permissions_catalog_code ON public.permissions_catalog(code);
CREATE INDEX idx_permissions_catalog_category ON public.permissions_catalog(category);
CREATE INDEX idx_permissions_catalog_type ON public.permissions_catalog(type);

-- Add comment
COMMENT ON TABLE public.permissions_catalog IS 'Global catalog of all available permissions (platform-level)';

-- ============================================================================
-- SEED PERMISSIONS CATALOG
-- ============================================================================

-- Dashboard permissions
INSERT INTO public.permissions_catalog (code, name, description, category, type, display_order) VALUES
('dashboard.view', 'View Dashboard', 'Access to the main dashboard', 'dashboard', 'page_access', 1);

-- Notifications permissions
INSERT INTO public.permissions_catalog (code, name, description, category, type, display_order) VALUES
('notifications.view', 'View Notifications', 'Access to notifications page', 'notifications', 'page_access', 1),
('notifications.manage', 'Manage Notifications', 'Mark notifications as read/unread', 'notifications', 'action', 2);

-- Client permissions
INSERT INTO public.permissions_catalog (code, name, description, category, type, display_order) VALUES
('clients.view', 'View Clients', 'View client profiles and details', 'clients', 'page_access', 1),
('clients.list', 'View Clients List', 'Access to the clients list page', 'clients', 'page_access', 2),
('clients.create', 'Create Clients', 'Add new clients to the system', 'clients', 'action', 3),
('clients.edit', 'Edit Clients', 'Modify client information', 'clients', 'action', 4),
('clients.delete', 'Delete Clients', 'Remove clients from the system', 'clients', 'action', 5),
('clients.data', 'Client Data Management', 'Access to client data management page', 'clients', 'page_access', 6),
('clients.leads', 'Lead Tracker', 'Access to leads tracker page', 'clients', 'page_access', 7),
('clients.platform_overview', 'Platform Overview', 'Access to platform assignments overview', 'clients', 'page_access', 8);

-- Sales permissions
INSERT INTO public.permissions_catalog (code, name, description, category, type, display_order) VALUES
('sales.view', 'View Sales', 'View sales overview and management', 'sales', 'page_access', 1),
('sales.tracker', 'Sales Tracker', 'Access to personal sales tracker', 'sales', 'page_access', 2),
('sales.submit', 'Submit Sales', 'Log new sales entries', 'sales', 'action', 3),
('sales.approve', 'Approve Sales', 'Approve or reject pending sales', 'sales', 'action', 4),
('sales.delete', 'Delete Sales', 'Remove sales entries', 'sales', 'action', 5),
('sales.all', 'View All Sales', 'Access to all sales view', 'sales', 'page_access', 6),
('sales.performance', 'Chatter Performance', 'View chatter performance metrics', 'sales', 'page_access', 7),
('sales.payroll', 'Payroll Sheet', 'Access to payroll management', 'sales', 'page_access', 8);

-- Customs permissions
INSERT INTO public.permissions_catalog (code, name, description, category, type, display_order) VALUES
('customs.view', 'View Customs', 'View custom requests', 'customs', 'page_access', 1),
('customs.my_customs', 'My Customs', 'View own assigned customs', 'customs', 'page_access', 2),
('customs.all', 'View All Customs', 'Access to all customs page', 'customs', 'page_access', 3),
('customs.pending_approval', 'Pending Approval', 'View pending approval queue', 'customs', 'page_access', 4),
('customs.pending_completion', 'Pending Completion', 'View in-progress customs', 'customs', 'page_access', 5),
('customs.pending_delivery', 'Pending Delivery', 'View completed customs awaiting delivery', 'customs', 'page_access', 6),
('customs.calls', 'Calls', 'View scheduled calls', 'customs', 'page_access', 7),
('customs.create', 'Create Customs', 'Submit new custom requests', 'customs', 'action', 8),
('customs.approve', 'Approve Customs', 'Approve custom requests', 'customs', 'action', 9),
('customs.complete', 'Complete Customs', 'Mark customs as completed', 'customs', 'action', 10),
('customs.deliver', 'Deliver Customs', 'Mark customs as delivered', 'customs', 'action', 11),
('customs.delete', 'Delete Customs', 'Remove custom requests', 'customs', 'action', 12);

-- Team permissions
INSERT INTO public.permissions_catalog (code, name, description, category, type, display_order) VALUES
('team.view', 'View Team', 'View team members', 'team', 'page_access', 1),
('team.attendance', 'Attendance', 'Access to attendance tracking', 'team', 'page_access', 2),
('team.assignments', 'Assignments', 'Manage chatter-client assignments', 'team', 'page_access', 3),
('team.user_approvals', 'User Approvals', 'Approve new user signups', 'team', 'page_access', 4),
('team.approve_users', 'Approve Users', 'Approve pending user accounts', 'team', 'action', 5),
('team.edit_members', 'Edit Team Members', 'Modify team member details and roles', 'team', 'action', 6),
('team.invite', 'Invite Team Members', 'Send invitations to new team members', 'team', 'action', 7),
('team.record_attendance', 'Record Attendance', 'Log attendance records', 'team', 'action', 8);

-- Communications permissions
INSERT INTO public.permissions_catalog (code, name, description, category, type, display_order) VALUES
('comms.chats', 'Client Chats', 'Access to client chat threads', 'communications', 'page_access', 1),
('comms.sms', 'SMS Messaging', 'Access to SMS messaging page', 'communications', 'page_access', 2),
('comms.send_sms', 'Send SMS', 'Send SMS messages to clients', 'communications', 'action', 3),
('comms.view_threads', 'View Chat Threads', 'View chat thread content', 'communications', 'action', 4);

-- Content permissions
INSERT INTO public.permissions_catalog (code, name, description, category, type, display_order) VALUES
('content.scenes', 'Scene Library', 'Access to scene library', 'content', 'page_access', 1),
('content.assignments', 'Scene Assignments', 'View scene assignments', 'content', 'page_access', 2),
('content.create_scene', 'Create Scenes', 'Add new scenes to library', 'content', 'action', 3),
('content.edit_scene', 'Edit Scenes', 'Modify existing scenes', 'content', 'action', 4),
('content.delete_scene', 'Delete Scenes', 'Remove scenes from library', 'content', 'action', 5),
('content.assign', 'Assign Scenes', 'Assign scenes to clients', 'content', 'action', 6);

-- Agencies permissions (B2B partners)
INSERT INTO public.permissions_catalog (code, name, description, category, type, display_order) VALUES
('agencies.view', 'View Agencies', 'Access to agencies list', 'agencies', 'page_access', 1),
('agencies.create', 'Create Agencies', 'Add new managed agencies', 'agencies', 'action', 2),
('agencies.edit', 'Edit Agencies', 'Modify agency details', 'agencies', 'action', 3),
('agencies.delete', 'Delete Agencies', 'Remove agencies', 'agencies', 'action', 4);

-- Settings/Admin permissions
INSERT INTO public.permissions_catalog (code, name, description, category, type, display_order) VALUES
('settings.roles', 'Role Management', 'Manage tenant roles and permissions', 'settings', 'page_access', 1),
('settings.manage_roles', 'Manage Roles', 'Create, edit, and delete roles', 'settings', 'action', 2),
('settings.tenant', 'Tenant Settings', 'Manage tenant/agency settings', 'settings', 'page_access', 3);

-- ============================================================================
-- RLS POLICIES FOR PERMISSIONS_CATALOG
-- ============================================================================

ALTER TABLE public.permissions_catalog ENABLE ROW LEVEL SECURITY;

-- Everyone can read the permissions catalog (it's platform-level)
CREATE POLICY "permissions_catalog_select_all"
  ON public.permissions_catalog FOR SELECT
  USING (true);

-- Only platform admins can modify the catalog
CREATE POLICY "permissions_catalog_admin_all"
  ON public.permissions_catalog FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Service role bypass
CREATE POLICY "service_permissions_catalog"
  ON public.permissions_catalog FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- UPDATE TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_permissions_catalog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER permissions_catalog_updated_at
  BEFORE UPDATE ON public.permissions_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_permissions_catalog_updated_at();

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

