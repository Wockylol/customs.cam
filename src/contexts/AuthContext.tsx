import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { TenantRole } from '../lib/tenant';
import { PermissionCode } from '../hooks/usePermissions';

type TeamMemberRow = Database['public']['Tables']['team_members']['Row'];
type TenantRoleRow = Database['public']['Tables']['tenant_roles']['Row'];

// Extended team member type with tenant_id and role_id
interface TeamMember extends Omit<TeamMemberRow, 'role'> {
  tenant_id: string | null;
  role: TenantRole;
  role_id: string | null;
}

// User's role with details
interface UserRole {
  id: string;
  name: string;
  slug: string;
  hierarchy_level: number;
  color: string;
  is_system_default: boolean;
  is_immutable: boolean;
}

interface AuthContextType {
  user: User | null;
  teamMember: TeamMember | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isPlatformAdmin: boolean;
  // Permissions
  permissions: PermissionCode[];
  userRole: UserRole | null;
  permissionsLoading: boolean;
  hasPermission: (code: PermissionCode) => boolean;
  hasAnyPermission: (codes: PermissionCode[]) => boolean;
  hasAllPermissions: (codes: PermissionCode[]) => boolean;
  isManagerOrAbove: boolean;
  isAdminOrAbove: boolean;
  isOwner: boolean;
  refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Legacy permissions mapping for backward compatibility
function getLegacyPermissions(role: string): PermissionCode[] {
  const basePermissions: PermissionCode[] = [
    'dashboard.view',
    'notifications.view',
    'notifications.manage',
  ];

  switch (role) {
    case 'owner':
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [teamMember, setTeamMember] = useState<TeamMember | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  
  // Permissions state
  const [permissions, setPermissions] = useState<PermissionCode[]>([]);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [permissionsLoading, setPermissionsLoading] = useState(true);

  // Fetch permissions for user
  const fetchPermissions = useCallback(async (member: TeamMember | null, isAdmin: boolean) => {
    console.log('[AuthContext] fetchPermissions called:', { hasMember: !!member, isAdmin });
    if (!member) {
      setPermissions([]);
      setUserRole(null);
      setPermissionsLoading(false);
      return;
    }

    try {
      console.log('[AuthContext] Setting permissionsLoading=true');
      setPermissionsLoading(true);

      // Platform admins have all permissions
      if (isAdmin) {
        const { data: allPerms } = await supabase
          .from('permissions_catalog')
          .select('code')
          .eq('is_active', true);
        
        if (allPerms) {
          setPermissions(allPerms.map(p => p.code as PermissionCode));
        }
        setPermissionsLoading(false);
        return;
      }

      // Fetch user's role if role_id exists
      if (member.role_id) {
        const { data: roleData, error: roleError } = await supabase
          .from('tenant_roles')
          .select('*')
          .eq('id', member.role_id)
          .single();

        if (!roleError && roleData) {
          setUserRole({
            id: roleData.id,
            name: roleData.name,
            slug: roleData.slug,
            hierarchy_level: roleData.hierarchy_level,
            color: roleData.color,
            is_system_default: roleData.is_system_default,
            is_immutable: roleData.is_immutable,
          });
        }

        // Fetch permissions for the role
        const { data: permData, error: permError } = await supabase
          .from('tenant_role_permissions')
          .select(`
            permission_id,
            permissions_catalog!inner(code)
          `)
          .eq('role_id', member.role_id);

        if (!permError && permData) {
          const codes = permData
            .map((p: any) => p.permissions_catalog?.code as PermissionCode)
            .filter(Boolean);
          setPermissions(codes);
        } else {
          // Fallback to legacy permissions
          setPermissions(getLegacyPermissions(member.role));
        }
      } else {
        // Fallback: Use legacy role column to determine permissions
        setPermissions(getLegacyPermissions(member.role));
      }

    } catch (err: any) {
      console.error('Error fetching permissions:', err);
      // Fallback to legacy permissions
      if (member) {
        setPermissions(getLegacyPermissions(member.role));
      }
    } finally {
      setPermissionsLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log('[AuthContext] Main useEffect running (should only run once on mount)');
    let mounted = true;

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error('Session error:', error);
          setLoading(false);
          setPermissionsLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        // Do not block initial render on team member fetch
        setLoading(false);
        
        if (session?.user) {
          // Fire-and-forget team member fetch
          console.log('[AuthContext] initializeAuth - calling fetchTeamMember');
          fetchTeamMember(session.user.id);
        } else {
          setPermissionsLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setLoading(false);
          setPermissionsLoading(false);
        }
      }
    };
    
    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      console.log('[AuthContext] onAuthStateChange fired:', { event, hasSession: !!session, mounted });
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (event === 'SIGNED_OUT' || !session?.user) {
        console.log('[AuthContext] Signed out or no session - clearing state');
        setTeamMember(null);
        setPermissions([]);
        setUserRole(null);
        setIsPlatformAdmin(false);
        setLoading(false);
        setPermissionsLoading(false);
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        // Only refetch on actual sign-in or user updates, not token refresh
        // This prevents losing page state when switching browser tabs
        console.log('[AuthContext] SIGNED_IN or USER_UPDATED - fetching team member');
        setLoading(false);
        fetchTeamMember(session.user.id);
      } else {
        // For TOKEN_REFRESHED and other events, just update session without refetching
        // This preserves component state when the tab regains focus
        console.log('[AuthContext] Other event (e.g. TOKEN_REFRESHED) - NOT refetching');
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchTeamMember = async (userId: string) => {
    console.log('[AuthContext] fetchTeamMember called for userId:', userId);
    let member: TeamMember | null = null;
    let isAdmin = false;

    try {
      // Fetch team member with tenant_id and role_id
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Team member query error:', error);
        if (error.code && error.code !== 'PGRST116') {
          console.warn('Non-fatal team member fetch error, proceeding without team member.');
        }
        setTeamMember(null);
      } else if (data) {
        member = data as unknown as TeamMember;
        setTeamMember(member);
      } else {
        setTeamMember(null);
      }

      // Check if user is a platform admin
      try {
        const { data: platformAdminData, error: paError } = await supabase
          .from('platform_admins')
          .select('id, role')
          .eq('user_id', userId)
          .eq('is_active', true)
          .maybeSingle();

        if (paError) {
          console.warn('Platform admin check failed (RLS issue?):', paError.message);
          setIsPlatformAdmin(false);
        } else {
          isAdmin = !!platformAdminData;
          setIsPlatformAdmin(isAdmin);
        }
      } catch (paErr) {
        console.warn('Platform admin check error:', paErr);
        setIsPlatformAdmin(false);
      }

      // Fetch permissions after team member and platform admin status are known
      await fetchPermissions(member, isAdmin);

    } catch (error) {
      console.error('Unexpected error in fetchTeamMember:', error);
      setTeamMember(null);
      setIsPlatformAdmin(false);
      setPermissions([]);
      setUserRole(null);
      setPermissionsLoading(false);
    }
  };

  // Permission check functions
  const hasPermission = useCallback((code: PermissionCode): boolean => {
    if (isPlatformAdmin) return true;
    return permissions.includes(code);
  }, [permissions, isPlatformAdmin]);

  const hasAnyPermission = useCallback((codes: PermissionCode[]): boolean => {
    if (isPlatformAdmin) return true;
    return codes.some(code => permissions.includes(code));
  }, [permissions, isPlatformAdmin]);

  const hasAllPermissions = useCallback((codes: PermissionCode[]): boolean => {
    if (isPlatformAdmin) return true;
    return codes.every(code => permissions.includes(code));
  }, [permissions, isPlatformAdmin]);

  // Role hierarchy checks
  const isManagerOrAbove = isPlatformAdmin || (userRole ? userRole.hierarchy_level >= 60 : ['owner', 'admin', 'manager'].includes(teamMember?.role || ''));
  const isAdminOrAbove = isPlatformAdmin || (userRole ? userRole.hierarchy_level >= 80 : ['owner', 'admin'].includes(teamMember?.role || ''));
  const isOwner = isPlatformAdmin || (userRole ? userRole.hierarchy_level >= 100 : teamMember?.role === 'owner');

  // Refresh permissions
  const refreshPermissions = useCallback(async () => {
    await fetchPermissions(teamMember, isPlatformAdmin);
  }, [teamMember, isPlatformAdmin, fetchPermissions]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value: AuthContextType = {
    user,
    teamMember,
    session,
    loading,
    signIn,
    signOut,
    isPlatformAdmin,
    // Permissions
    permissions,
    userRole,
    permissionsLoading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isManagerOrAbove,
    isAdminOrAbove,
    isOwner,
    refreshPermissions,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
