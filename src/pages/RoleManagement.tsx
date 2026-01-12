import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Plus, Edit2, Trash2, Copy, Check, X, 
  ChevronDown, ChevronUp, Users, AlertTriangle, Save,
  LayoutDashboard, Bell, DollarSign, FileText, UserCog,
  MessageSquare, Film, Building2, Settings, Lock
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { PermissionCode, PERMISSION_CATEGORIES } from '../hooks/usePermissions';

interface TenantRole {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  hierarchy_level: number;
  is_system_default: boolean;
  is_immutable: boolean;
  created_at: string;
}

interface Permission {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  type: 'page_access' | 'action';
  display_order: number;
}

interface RolePermission {
  role_id: string;
  permission_id: string;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  dashboard: LayoutDashboard,
  notifications: Bell,
  clients: Users,
  sales: DollarSign,
  customs: FileText,
  team: UserCog,
  communications: MessageSquare,
  content: Film,
  agencies: Building2,
  settings: Settings,
};

const RoleManagement: React.FC = () => {
  const { teamMember, hasPermission, isOwner } = useAuth();
  const { tenant } = useTenant();
  
  const [roles, setRoles] = useState<TenantRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI State
  const [selectedRole, setSelectedRole] = useState<TenantRole | null>(null);
  const [editingRole, setEditingRole] = useState<Partial<TenantRole> | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['dashboard', 'clients']));
  const [pendingChanges, setPendingChanges] = useState<Map<string, Set<string>>>(new Map());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Can user manage roles?
  const canManageRoles = hasPermission('settings.manage_roles');

  // Fetch roles and permissions
  useEffect(() => {
    if (!tenant?.id) return;
    
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch roles
        const { data: rolesData, error: rolesError } = await supabase
          .from('tenant_roles')
          .select('*')
          .eq('tenant_id', tenant.id)
          .order('hierarchy_level', { ascending: false });
        
        if (rolesError) throw rolesError;
        setRoles(rolesData || []);
        
        // Fetch all permissions
        const { data: permsData, error: permsError } = await supabase
          .from('permissions_catalog')
          .select('*')
          .eq('is_active', true)
          .order('category')
          .order('display_order');
        
        if (permsError) throw permsError;
        setPermissions(permsData || []);
        
        // Fetch role permissions for all roles
        const roleIds = (rolesData || []).map(r => r.id);
        if (roleIds.length > 0) {
          const { data: rpData, error: rpError } = await supabase
            .from('tenant_role_permissions')
            .select('role_id, permission_id')
            .in('role_id', roleIds);
          
          if (rpError) throw rpError;
          
          // Build map of role -> permissions
          const rpMap = new Map<string, Set<string>>();
          (rpData || []).forEach(rp => {
            if (!rpMap.has(rp.role_id)) {
              rpMap.set(rp.role_id, new Set());
            }
            rpMap.get(rp.role_id)!.add(rp.permission_id);
          });
          setRolePermissions(rpMap);
        }
        
        // Select first role by default
        if (rolesData && rolesData.length > 0 && !selectedRole) {
          setSelectedRole(rolesData[0]);
        }
        
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load roles');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [tenant?.id]);

  // Group permissions by category
  const permissionsByCategory = useMemo(() => {
    const grouped = new Map<string, Permission[]>();
    permissions.forEach(perm => {
      if (!grouped.has(perm.category)) {
        grouped.set(perm.category, []);
      }
      grouped.get(perm.category)!.push(perm);
    });
    return grouped;
  }, [permissions]);

  // Get current permissions for selected role (including pending changes)
  const currentRolePermissions = useMemo(() => {
    if (!selectedRole) return new Set<string>();
    
    // Start with saved permissions
    const saved = rolePermissions.get(selectedRole.id) || new Set();
    
    // Apply pending changes
    const pending = pendingChanges.get(selectedRole.id);
    if (pending) {
      const result = new Set(saved);
      pending.forEach(permId => {
        if (result.has(permId)) {
          result.delete(permId);
        } else {
          result.add(permId);
        }
      });
      return result;
    }
    
    return saved;
  }, [selectedRole, rolePermissions, pendingChanges]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    return pendingChanges.size > 0 && 
      Array.from(pendingChanges.values()).some(changes => changes.size > 0);
  }, [pendingChanges]);

  // Toggle permission for current role
  const togglePermission = (permissionId: string) => {
    if (!selectedRole || !canManageRoles) return;
    if (selectedRole.is_immutable && !isOwner) return; // Only owner can modify immutable roles
    
    setPendingChanges(prev => {
      const next = new Map(prev);
      if (!next.has(selectedRole.id)) {
        next.set(selectedRole.id, new Set());
      }
      const roleChanges = new Set(next.get(selectedRole.id)!);
      
      if (roleChanges.has(permissionId)) {
        roleChanges.delete(permissionId);
      } else {
        roleChanges.add(permissionId);
      }
      
      next.set(selectedRole.id, roleChanges);
      return next;
    });
  };

  // Save changes
  const saveChanges = async () => {
    if (!selectedRole || !canManageRoles) return;
    
    setSaving(true);
    setError(null);
    
    try {
      const changes = pendingChanges.get(selectedRole.id);
      if (!changes || changes.size === 0) return;
      
      const saved = rolePermissions.get(selectedRole.id) || new Set();
      
      // Determine what to add and remove
      const toAdd: string[] = [];
      const toRemove: string[] = [];
      
      changes.forEach(permId => {
        if (saved.has(permId)) {
          toRemove.push(permId);
        } else {
          toAdd.push(permId);
        }
      });
      
      // Remove permissions
      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('tenant_role_permissions')
          .delete()
          .eq('role_id', selectedRole.id)
          .in('permission_id', toRemove);
        
        if (deleteError) throw deleteError;
      }
      
      // Add permissions
      if (toAdd.length > 0) {
        const { error: insertError } = await supabase
          .from('tenant_role_permissions')
          .insert(toAdd.map(permId => ({
            role_id: selectedRole.id,
            permission_id: permId,
            granted_by: teamMember?.id,
          })));
        
        if (insertError) throw insertError;
      }
      
      // Update local state
      const newPermissions = new Set(saved);
      toRemove.forEach(id => newPermissions.delete(id));
      toAdd.forEach(id => newPermissions.add(id));
      
      setRolePermissions(prev => {
        const next = new Map(prev);
        next.set(selectedRole.id, newPermissions);
        return next;
      });
      
      // Clear pending changes for this role
      setPendingChanges(prev => {
        const next = new Map(prev);
        next.delete(selectedRole.id);
        return next;
      });
      
    } catch (err: any) {
      console.error('Error saving permissions:', err);
      setError(err.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  // Create new role
  const createRole = async () => {
    if (!editingRole || !tenant?.id || !canManageRoles) return;
    
    setSaving(true);
    setError(null);
    
    try {
      const slug = editingRole.name!.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      
      const { data, error: createError } = await supabase
        .from('tenant_roles')
        .insert({
          tenant_id: tenant.id,
          name: editingRole.name,
          slug,
          description: editingRole.description || null,
          color: editingRole.color || '#6B7280',
          hierarchy_level: editingRole.hierarchy_level || 50,
          is_system_default: false,
          is_immutable: false,
          created_by: teamMember?.id,
        })
        .select()
        .single();
      
      if (createError) throw createError;
      
      setRoles(prev => [...prev, data].sort((a, b) => b.hierarchy_level - a.hierarchy_level));
      setSelectedRole(data);
      setShowCreateModal(false);
      setEditingRole(null);
      
    } catch (err: any) {
      console.error('Error creating role:', err);
      setError(err.message || 'Failed to create role');
    } finally {
      setSaving(false);
    }
  };

  // Update role
  const updateRole = async () => {
    if (!editingRole?.id || !canManageRoles) return;
    
    setSaving(true);
    setError(null);
    
    try {
      // Get the current role to check if it's a system default
      const currentRole = roles.find(r => r.id === editingRole.id);
      
      // Prepare update data - exclude name for system default roles
      const updateData: any = {
        description: editingRole.description,
        color: editingRole.color,
        hierarchy_level: editingRole.hierarchy_level,
      };
      
      // Only update name if it's not a system default role
      if (!currentRole?.is_system_default) {
        updateData.name = editingRole.name;
      }
      
      const { error: updateError } = await supabase
        .from('tenant_roles')
        .update(updateData)
        .eq('id', editingRole.id);
      
      if (updateError) throw updateError;
      
      setRoles(prev => prev.map(r => 
        r.id === editingRole.id 
          ? { ...r, ...editingRole } as TenantRole
          : r
      ).sort((a, b) => b.hierarchy_level - a.hierarchy_level));
      
      if (selectedRole?.id === editingRole.id) {
        setSelectedRole({ ...selectedRole, ...editingRole } as TenantRole);
      }
      
      setEditingRole(null);
      
    } catch (err: any) {
      console.error('Error updating role:', err);
      setError(err.message || 'Failed to update role');
    } finally {
      setSaving(false);
    }
  };

  // Delete role
  const deleteRole = async (roleId: string) => {
    if (!canManageRoles) return;
    
    const role = roles.find(r => r.id === roleId);
    // Prevent deletion of immutable roles and system default roles
    if (!role || role.is_immutable || role.is_system_default) return;
    
    setSaving(true);
    setError(null);
    
    try {
      const { error: deleteError } = await supabase
        .from('tenant_roles')
        .delete()
        .eq('id', roleId);
      
      if (deleteError) throw deleteError;
      
      setRoles(prev => prev.filter(r => r.id !== roleId));
      
      if (selectedRole?.id === roleId) {
        setSelectedRole(roles.find(r => r.id !== roleId) || null);
      }
      
      setShowDeleteConfirm(null);
      
    } catch (err: any) {
      console.error('Error deleting role:', err);
      setError(err.message || 'Failed to delete role');
    } finally {
      setSaving(false);
    }
  };

  // Clone role
  const cloneRole = async (role: TenantRole) => {
    if (!tenant?.id || !canManageRoles) return;
    
    setSaving(true);
    setError(null);
    
    try {
      const newName = `${role.name} (Copy)`;
      const slug = newName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      
      // Create new role
      const { data: newRole, error: createError } = await supabase
        .from('tenant_roles')
        .insert({
          tenant_id: tenant.id,
          name: newName,
          slug,
          description: role.description,
          color: role.color,
          hierarchy_level: Math.max(role.hierarchy_level - 5, 10),
          is_system_default: false,
          is_immutable: false,
          created_by: teamMember?.id,
        })
        .select()
        .single();
      
      if (createError) throw createError;
      
      // Copy permissions
      const sourcePerms = rolePermissions.get(role.id);
      if (sourcePerms && sourcePerms.size > 0) {
        const { error: permsError } = await supabase
          .from('tenant_role_permissions')
          .insert(Array.from(sourcePerms).map(permId => ({
            role_id: newRole.id,
            permission_id: permId,
            granted_by: teamMember?.id,
          })));
        
        if (permsError) throw permsError;
        
        // Update local state
        setRolePermissions(prev => {
          const next = new Map(prev);
          next.set(newRole.id, new Set(sourcePerms));
          return next;
        });
      }
      
      setRoles(prev => [...prev, newRole].sort((a, b) => b.hierarchy_level - a.hierarchy_level));
      setSelectedRole(newRole);
      
    } catch (err: any) {
      console.error('Error cloning role:', err);
      setError(err.message || 'Failed to clone role');
    } finally {
      setSaving(false);
    }
  };

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <Shield className="w-7 h-7 mr-3 text-blue-600" />
              Role Management
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Create and manage custom roles with specific permissions
            </p>
          </div>
          
          {canManageRoles && (
            <button
              onClick={() => {
                setEditingRole({ name: '', description: '', color: '#6B7280', hierarchy_level: 50 });
                setShowCreateModal(true);
              }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Role
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Role List */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="font-semibold text-gray-900 dark:text-white">Roles</h2>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {roles.map(role => (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role)}
                    className={`w-full p-4 text-left transition-colors ${
                      selectedRole?.id === role.id 
                        ? 'bg-blue-50 dark:bg-blue-900/20' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-3"
                          style={{ backgroundColor: role.color }}
                        />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white flex items-center">
                            {role.name}
                            {role.is_immutable && (
                              <Lock className="w-3 h-3 ml-1.5 text-gray-400" />
                            )}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Level {role.hierarchy_level}
                            {role.is_system_default && ' • System'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Permissions Editor */}
          <div className="lg:col-span-3">
            {selectedRole ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Role Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-4 h-4 rounded-full mr-3"
                      style={{ backgroundColor: selectedRole.color }}
                    />
                    <div>
                      <h2 className="font-semibold text-gray-900 dark:text-white flex items-center">
                        {selectedRole.name}
                        {selectedRole.is_immutable && (
                          <Lock className="w-4 h-4 ml-2 text-gray-400" />
                        )}
                        {selectedRole.is_system_default && (
                          <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                            System Role
                          </span>
                        )}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedRole.description || `Hierarchy Level ${selectedRole.hierarchy_level}`}
                      </p>
                      {selectedRole.is_system_default && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          System default roles cannot be deleted
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {canManageRoles && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => cloneRole(selectedRole)}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        title="Clone Role"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                      {!selectedRole.is_immutable && (
                        <button
                          onClick={() => setEditingRole(selectedRole)}
                          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                          title="Edit Role"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                      )}
                      {!selectedRole.is_immutable && !selectedRole.is_system_default && (
                        <button
                          onClick={() => setShowDeleteConfirm(selectedRole.id)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                          title="Delete Role"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Permissions List */}
                <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                  {Array.from(permissionsByCategory.entries()).map(([category, perms]) => {
                    const CategoryIcon = CATEGORY_ICONS[category] || Settings;
                    const isExpanded = expandedCategories.has(category);
                    const categoryInfo = PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES];
                    
                    return (
                      <div key={category} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                        <button
                          onClick={() => toggleCategory(category)}
                          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <div className="flex items-center">
                            <CategoryIcon className="w-5 h-5 mr-3 text-gray-400" />
                            <span className="font-medium text-gray-900 dark:text-white">
                              {categoryInfo?.name || category.charAt(0).toUpperCase() + category.slice(1)}
                            </span>
                            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                              ({perms.filter(p => currentRolePermissions.has(p.id)).length}/{perms.length})
                            </span>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                        
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 space-y-2">
                                {perms.map(perm => {
                                  const isGranted = currentRolePermissions.has(perm.id);
                                  const isPending = pendingChanges.get(selectedRole.id)?.has(perm.id);
                                  
                                  return (
                                    <label
                                      key={perm.id}
                                      className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                                        isGranted
                                          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                                          : 'bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600'
                                      } ${!canManageRoles || (selectedRole.is_immutable && !isOwner) ? 'opacity-75 cursor-not-allowed' : 'hover:border-blue-300 dark:hover:border-blue-700'}`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isGranted}
                                        onChange={() => togglePermission(perm.id)}
                                        disabled={!canManageRoles || (selectedRole.is_immutable && !isOwner)}
                                        className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                                      />
                                      <div className="ml-3 flex-1">
                                        <div className="flex items-center">
                                          <span className="font-medium text-gray-900 dark:text-white">
                                            {perm.name}
                                          </span>
                                          {isPending && (
                                            <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded">
                                              Unsaved
                                            </span>
                                          )}
                                          <span className={`ml-2 px-2 py-0.5 text-xs rounded ${
                                            perm.type === 'page_access'
                                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                              : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                          }`}>
                                            {perm.type === 'page_access' ? 'Page' : 'Action'}
                                          </span>
                                        </div>
                                        {perm.description && (
                                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                            {perm.description}
                                          </p>
                                        )}
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>

                {/* Save Bar */}
                {hasUnsavedChanges && pendingChanges.has(selectedRole.id) && (
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-between">
                    <div className="flex items-center text-yellow-700 dark:text-yellow-300">
                      <AlertTriangle className="w-5 h-5 mr-2" />
                      <span>You have unsaved changes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setPendingChanges(prev => {
                            const next = new Map(prev);
                            next.delete(selectedRole.id);
                            return next;
                          });
                        }}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        Discard
                      </button>
                      <button
                        onClick={saveChanges}
                        disabled={saving}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {saving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                <Shield className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Select a Role
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Choose a role from the list to view and manage its permissions
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Create/Edit Role Modal */}
      <AnimatePresence>
        {(showCreateModal || (editingRole && editingRole.id)) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => {
              setShowCreateModal(false);
              setEditingRole(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingRole?.id ? 'Edit Role' : 'Create New Role'}
                </h3>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Role Name
                  </label>
                  <input
                    type="text"
                    value={editingRole?.name || ''}
                    onChange={e => setEditingRole(prev => ({ ...prev, name: e.target.value }))}
                    disabled={!!(editingRole?.id && roles.find(r => r.id === editingRole.id)?.is_system_default)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="e.g., Shift Lead"
                  />
                  {editingRole?.id && roles.find(r => r.id === editingRole.id)?.is_system_default && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      System default role names cannot be changed
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editingRole?.description || ''}
                    onChange={e => setEditingRole(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={2}
                    placeholder="Brief description of this role"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editingRole?.color || '#6B7280'}
                        onChange={e => setEditingRole(prev => ({ ...prev, color: e.target.value }))}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={editingRole?.color || '#6B7280'}
                        onChange={e => setEditingRole(prev => ({ ...prev, color: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Hierarchy Level
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="99"
                      value={editingRole?.hierarchy_level || 50}
                      onChange={e => setEditingRole(prev => ({ ...prev, hierarchy_level: parseInt(e.target.value) || 50 }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Higher = more access (10-99)
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingRole(null);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={editingRole?.id ? updateRole : createRole}
                  disabled={!editingRole?.name || saving}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      {editingRole?.id ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Update Role
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Create Role
                        </>
                      )}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setShowDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden"
            >
              <div className="p-6">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-2">
                  Delete Role?
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
                  This action cannot be undone. Any team members with this role will need to be reassigned.
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteRole(showDeleteConfirm)}
                    disabled={saving}
                    className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Role
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
};

export default RoleManagement;

