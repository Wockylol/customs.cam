import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// ============================================================================
// PERMISSION TYPES
// ============================================================================

export type PermissionCode =
  // Dashboard
  | 'dashboard.view'
  // Notifications
  | 'notifications.view'
  | 'notifications.manage'
  // Clients
  | 'clients.view'
  | 'clients.list'
  | 'clients.create'
  | 'clients.edit'
  | 'clients.delete'
  | 'clients.data'
  | 'clients.leads'
  | 'clients.platform_overview'
  // Sales
  | 'sales.view'
  | 'sales.tracker'
  | 'sales.submit'
  | 'sales.approve'
  | 'sales.delete'
  | 'sales.all'
  | 'sales.performance'
  | 'sales.payroll'
  // Customs
  | 'customs.view'
  | 'customs.my_customs'
  | 'customs.all'
  | 'customs.pending_approval'
  | 'customs.pending_completion'
  | 'customs.pending_delivery'
  | 'customs.calls'
  | 'customs.create'
  | 'customs.approve'
  | 'customs.complete'
  | 'customs.deliver'
  | 'customs.delete'
  // Team
  | 'team.view'
  | 'team.attendance'
  | 'team.assignments'
  | 'team.user_approvals'
  | 'team.approve_users'
  | 'team.edit_members'
  | 'team.invite'
  | 'team.record_attendance'
  // Communications
  | 'comms.chats'
  | 'comms.sms'
  | 'comms.send_sms'
  | 'comms.view_threads'
  // Content
  | 'content.scenes'
  | 'content.assignments'
  | 'content.create_scene'
  | 'content.edit_scene'
  | 'content.delete_scene'
  | 'content.assign'
  // Agencies
  | 'agencies.view'
  | 'agencies.create'
  | 'agencies.edit'
  | 'agencies.delete'
  // Settings
  | 'settings.roles'
  | 'settings.manage_roles'
  | 'settings.tenant';

export interface Permission {
  id: string;
  code: PermissionCode;
  name: string;
  description: string | null;
  category: string;
  type: 'page_access' | 'action';
}

export interface TenantRole {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  hierarchy_level: number;
  is_system_default: boolean;
  is_immutable: boolean;
}

export interface PermissionsState {
  permissions: PermissionCode[];
  role: TenantRole | null;
  loading: boolean;
  error: string | null;
}

// ============================================================================
// PERMISSION CATEGORIES FOR UI GROUPING
// ============================================================================

export const PERMISSION_CATEGORIES = {
  dashboard: { name: 'Dashboard', icon: 'LayoutDashboard' },
  notifications: { name: 'Notifications', icon: 'Bell' },
  clients: { name: 'Client Management', icon: 'Users' },
  sales: { name: 'Sales & Revenue', icon: 'DollarSign' },
  customs: { name: 'Custom Requests', icon: 'FileText' },
  team: { name: 'Team Management', icon: 'UserCog' },
  communications: { name: 'Communications', icon: 'MessageSquare' },
  content: { name: 'Content & Scenes', icon: 'Film' },
  agencies: { name: 'Agencies', icon: 'Building2' },
  settings: { name: 'Settings & Admin', icon: 'Settings' },
} as const;

// ============================================================================
// MAIN HOOK: usePermissions
// ============================================================================

export function usePermissions() {
  const { user, teamMember, isPlatformAdmin } = useAuth();
  const [permissions, setPermissions] = useState<PermissionCode[]>([]);
  const [role, setRole] = useState<TenantRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user permissions from database
  const fetchPermissions = useCallback(async () => {
    if (!user || !teamMember) {
      setPermissions([]);
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Platform admins have all permissions
      if (isPlatformAdmin) {
        const { data: allPerms } = await supabase
          .from('permissions_catalog')
          .select('code')
          .eq('is_active', true);
        
        if (allPerms) {
          setPermissions(allPerms.map(p => p.code as PermissionCode));
        }
        setLoading(false);
        return;
      }

      // Fetch user's role
      if (teamMember.role_id) {
        const { data: roleData, error: roleError } = await supabase
          .from('tenant_roles')
          .select('*')
          .eq('id', teamMember.role_id)
          .single();

        if (roleError) {
          console.error('Error fetching role:', roleError);
        } else if (roleData) {
          setRole(roleData as TenantRole);
        }

        // Fetch permissions for the role
        const { data: permData, error: permError } = await supabase
          .from('tenant_role_permissions')
          .select(`
            permission_id,
            permissions_catalog!inner(code)
          `)
          .eq('role_id', teamMember.role_id);

        if (permError) {
          console.error('Error fetching permissions:', permError);
          setError('Failed to load permissions');
        } else if (permData) {
          const codes = permData.map((p: any) => p.permissions_catalog?.code as PermissionCode).filter(Boolean);
          setPermissions(codes);
        }
      } else {
        // Fallback: Use legacy role column to determine permissions
        const legacyPermissions = getLegacyPermissions(teamMember.role);
        setPermissions(legacyPermissions);
      }

    } catch (err: any) {
      console.error('Error in fetchPermissions:', err);
      setError(err.message || 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  }, [user, teamMember, isPlatformAdmin]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // Check if user has a specific permission
  const hasPermission = useCallback((permissionCode: PermissionCode): boolean => {
    if (isPlatformAdmin) return true;
    return permissions.includes(permissionCode);
  }, [permissions, isPlatformAdmin]);

  // Check if user has any of the specified permissions
  const hasAnyPermission = useCallback((permissionCodes: PermissionCode[]): boolean => {
    if (isPlatformAdmin) return true;
    return permissionCodes.some(code => permissions.includes(code));
  }, [permissions, isPlatformAdmin]);

  // Check if user has all of the specified permissions
  const hasAllPermissions = useCallback((permissionCodes: PermissionCode[]): boolean => {
    if (isPlatformAdmin) return true;
    return permissionCodes.every(code => permissions.includes(code));
  }, [permissions, isPlatformAdmin]);

  // Get permissions by category
  const getPermissionsByCategory = useCallback((category: string): PermissionCode[] => {
    return permissions.filter(code => code.startsWith(`${category}.`));
  }, [permissions]);

  // Check if user has at least manager-level access (hierarchy >= 60)
  const isManagerOrAbove = useMemo(() => {
    if (isPlatformAdmin) return true;
    if (role) return role.hierarchy_level >= 60;
    // Fallback to legacy role
    return ['owner', 'admin', 'manager'].includes(teamMember?.role || '');
  }, [role, teamMember, isPlatformAdmin]);

  // Check if user has at least admin-level access (hierarchy >= 80)
  const isAdminOrAbove = useMemo(() => {
    if (isPlatformAdmin) return true;
    if (role) return role.hierarchy_level >= 80;
    // Fallback to legacy role
    return ['owner', 'admin'].includes(teamMember?.role || '');
  }, [role, teamMember, isPlatformAdmin]);

  // Check if user is owner (hierarchy >= 100)
  const isOwner = useMemo(() => {
    if (isPlatformAdmin) return true;
    if (role) return role.hierarchy_level >= 100;
    // Fallback to legacy role
    return teamMember?.role === 'owner';
  }, [role, teamMember, isPlatformAdmin]);

  return {
    permissions,
    role,
    loading,
    error,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getPermissionsByCategory,
    isManagerOrAbove,
    isAdminOrAbove,
    isOwner,
    refresh: fetchPermissions,
  };
}

// ============================================================================
// LEGACY PERMISSION MAPPING
// ============================================================================

function getLegacyPermissions(role: string): PermissionCode[] {
  const basePermissions: PermissionCode[] = [
    'dashboard.view',
    'notifications.view',
    'notifications.manage',
  ];

  switch (role) {
    case 'owner':
      // Owner has all permissions
      return [
        ...basePermissions,
        'clients.view', 'clients.list', 'clients.create', 'clients.edit', 'clients.delete',
        'clients.data', 'clients.leads', 'clients.platform_overview',
        'sales.view', 'sales.tracker', 'sales.submit', 'sales.approve', 'sales.delete',
        'sales.all', 'sales.performance', 'sales.payroll',
        'customs.view', 'customs.my_customs', 'customs.all', 'customs.pending_approval',
        'customs.pending_completion', 'customs.pending_delivery', 'customs.calls',
        'customs.create', 'customs.approve', 'customs.complete', 'customs.deliver', 'customs.delete',
        'team.view', 'team.attendance', 'team.assignments', 'team.user_approvals',
        'team.approve_users', 'team.edit_members', 'team.invite', 'team.record_attendance',
        'comms.chats', 'comms.sms', 'comms.send_sms', 'comms.view_threads',
        'content.scenes', 'content.assignments', 'content.create_scene',
        'content.edit_scene', 'content.delete_scene', 'content.assign',
        'agencies.view', 'agencies.create', 'agencies.edit', 'agencies.delete',
        'settings.roles', 'settings.manage_roles', 'settings.tenant',
      ];

    case 'admin':
      return [
        ...basePermissions,
        'clients.view', 'clients.list', 'clients.create', 'clients.edit', 'clients.delete',
        'clients.data', 'clients.leads', 'clients.platform_overview',
        'sales.view', 'sales.tracker', 'sales.submit', 'sales.approve', 'sales.delete',
        'sales.all', 'sales.performance', 'sales.payroll',
        'customs.view', 'customs.my_customs', 'customs.all', 'customs.pending_approval',
        'customs.pending_completion', 'customs.pending_delivery', 'customs.calls',
        'customs.create', 'customs.approve', 'customs.complete', 'customs.deliver', 'customs.delete',
        'team.view', 'team.attendance', 'team.assignments', 'team.user_approvals',
        'team.approve_users', 'team.edit_members', 'team.invite', 'team.record_attendance',
        'comms.chats', 'comms.sms', 'comms.send_sms', 'comms.view_threads',
        'content.scenes', 'content.assignments', 'content.create_scene',
        'content.edit_scene', 'content.delete_scene', 'content.assign',
        'agencies.view', 'agencies.create', 'agencies.edit', 'agencies.delete',
        'settings.roles', 'settings.tenant',
      ];

    case 'manager':
      return [
        ...basePermissions,
        'clients.view', 'clients.list', 'clients.create', 'clients.edit', 'clients.platform_overview',
        'sales.view', 'sales.tracker', 'sales.submit', 'sales.approve', 'sales.all', 'sales.performance',
        'customs.view', 'customs.my_customs', 'customs.all', 'customs.pending_approval',
        'customs.pending_completion', 'customs.pending_delivery', 'customs.calls',
        'customs.create', 'customs.approve', 'customs.complete', 'customs.deliver',
        'team.view', 'team.attendance', 'team.assignments', 'team.user_approvals',
        'team.approve_users', 'team.record_attendance',
        'agencies.view',
      ];

    case 'chatter':
      return [
        ...basePermissions,
        'clients.view',
        'sales.tracker', 'sales.submit',
        'customs.view', 'customs.my_customs', 'customs.create',
      ];

    default:
      return [];
  }
}

// ============================================================================
// SIMPLE PERMISSION CHECK HOOK
// ============================================================================

export function useHasPermission(permissionCode: PermissionCode): boolean {
  const { hasPermission, loading } = usePermissions();
  
  // Return false while loading to prevent flash of content
  if (loading) return false;
  
  return hasPermission(permissionCode);
}

// ============================================================================
// MULTIPLE PERMISSIONS CHECK HOOK
// ============================================================================

export function useHasAnyPermission(permissionCodes: PermissionCode[]): boolean {
  const { hasAnyPermission, loading } = usePermissions();
  
  if (loading) return false;
  
  return hasAnyPermission(permissionCodes);
}

export default usePermissions;

