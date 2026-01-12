import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';

// Type definitions
export type TenantRole = Database['public']['Tables']['tenant_roles']['Row'];
export type TenantRoleInsert = Database['public']['Tables']['tenant_roles']['Insert'];
export type TenantRoleUpdate = Database['public']['Tables']['tenant_roles']['Update'];

// Role with team member count for admin display
export interface TenantRoleWithCount extends TenantRole {
  team_member_count?: number;
}

// Helper type for role filter options
export interface RoleFilterOption {
  value: string; // 'all' or role.id
  label: string; // 'All Roles' or role.name
  slug: string;  // '' for all, or role.slug
  color?: string;
}

// Default color map for roles
const ROLE_COLORS: Record<string, { bg: string; text: string; border: string; bgLight: string }> = {
  blue: { bg: 'bg-blue-600', text: 'text-blue-700', border: 'border-blue-500', bgLight: 'bg-blue-100' },
  purple: { bg: 'bg-purple-600', text: 'text-purple-700', border: 'border-purple-500', bgLight: 'bg-purple-100' },
  green: { bg: 'bg-green-600', text: 'text-green-700', border: 'border-green-500', bgLight: 'bg-green-100' },
  orange: { bg: 'bg-orange-600', text: 'text-orange-700', border: 'border-orange-500', bgLight: 'bg-orange-100' },
  red: { bg: 'bg-red-600', text: 'text-red-700', border: 'border-red-500', bgLight: 'bg-red-100' },
  indigo: { bg: 'bg-indigo-600', text: 'text-indigo-700', border: 'border-indigo-500', bgLight: 'bg-indigo-100' },
  pink: { bg: 'bg-pink-600', text: 'text-pink-700', border: 'border-pink-500', bgLight: 'bg-pink-100' },
  teal: { bg: 'bg-teal-600', text: 'text-teal-700', border: 'border-teal-500', bgLight: 'bg-teal-100' },
  yellow: { bg: 'bg-yellow-600', text: 'text-yellow-700', border: 'border-yellow-500', bgLight: 'bg-yellow-100' },
  gray: { bg: 'bg-gray-600', text: 'text-gray-700', border: 'border-gray-500', bgLight: 'bg-gray-100' },
};

/**
 * Hook for managing tenant roles
 * Provides fetching and utility functions for role management
 */
export const useTenantRoles = () => {
  const { user, teamMember } = useAuth();
  const { tenant } = useTenant();
  const [roles, setRoles] = useState<TenantRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tenantId = tenant?.id || teamMember?.tenant_id;

  // Fetch all roles for the current tenant
  const fetchRoles = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('tenant_roles')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('hierarchy_level', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setRoles(data || []);
    } catch (err: any) {
      console.error('Error fetching tenant roles:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // Get role filter options for dropdowns (includes "All Roles" option)
  const roleFilterOptions = useMemo((): RoleFilterOption[] => {
    const options: RoleFilterOption[] = [
      { value: 'all', label: 'All Roles', slug: '' }
    ];

    roles.forEach(role => {
      options.push({
        value: role.id,
        label: role.name,
        slug: role.slug,
        color: role.color,
      });
    });

    return options;
  }, [roles]);

  // Get a role by ID
  const getRoleById = useCallback((roleId: string | null): TenantRole | undefined => {
    if (!roleId) return undefined;
    return roles.find(r => r.id === roleId);
  }, [roles]);

  // Get a role by slug (for backward compatibility with legacy role values)
  const getRoleBySlug = useCallback((slug: string | null): TenantRole | undefined => {
    if (!slug) return undefined;
    return roles.find(r => r.slug === slug);
  }, [roles]);

  // Get a role by legacy role name (admin, manager, chatter, pending)
  const getRoleByLegacyName = useCallback((legacyRole: string | null): TenantRole | undefined => {
    if (!legacyRole) return undefined;
    // Try to match by slug first (most likely to match legacy role names)
    return roles.find(r => r.slug === legacyRole) || roles.find(r => r.name.toLowerCase() === legacyRole.toLowerCase());
  }, [roles]);

  // Check if roles are configured
  const hasRoles = roles.length > 0;

  // Get roles sorted by hierarchy (highest first)
  const sortedRoles = useMemo(() => {
    return [...roles].sort((a, b) => b.hierarchy_level - a.hierarchy_level);
  }, [roles]);

  // Get assignable roles (roles that can be assigned to team members)
  // Excludes 'pending' role as it's typically auto-assigned on signup
  const assignableRoles = useMemo(() => {
    return sortedRoles.filter(r => r.slug !== 'pending');
  }, [sortedRoles]);

  // Fetch roles on mount and when tenant changes
  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  return {
    roles,
    sortedRoles,
    assignableRoles,
    loading,
    error,
    hasRoles,
    fetchRoles,
    roleFilterOptions,
    getRoleById,
    getRoleBySlug,
    getRoleByLegacyName,
  };
};

/**
 * Get Tailwind color classes for a role based on its color hex or name
 */
export function getRoleColorClasses(color: string): { bg: string; text: string; border: string; bgLight: string } {
  // Check if it's a named color
  const namedColor = ROLE_COLORS[color.toLowerCase()];
  if (namedColor) return namedColor;

  // For hex colors, try to determine the closest named color
  // For now, default to blue for hex colors
  return ROLE_COLORS.blue;
}

/**
 * Get a contrasting text color for a given background hex color
 */
export function getContrastingTextColor(hexColor: string): 'text-white' | 'text-gray-900' {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? 'text-gray-900' : 'text-white';
}

export default useTenantRoles;

