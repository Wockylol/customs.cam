import React, { useState, useEffect, useRef } from 'react';
import { X, AlertCircle, User, Settings, Shield, ChevronDown, Check, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Database } from '../../lib/database.types';
import { useAuth } from '../../contexts/AuthContext';
import { useTenantShifts, formatTimeRange } from '../../hooks/useTenantShifts';
import { useTenantRoles } from '../../hooks/useTenantRoles';

type TeamMember = Database['public']['Tables']['team_members']['Row'];

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: TeamMember | null;
  onSubmit: (userId: string, userData: {
    fullName: string;
    email: string;
    role: string;
    roleId?: string | null;
    shift?: string;
    shiftId?: string | null;
  }) => Promise<{ error: string | null }>;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, user, onSubmit }) => {
  const { teamMember, isOwner, hasPermission } = useAuth();
  const { shifts, hasShifts, getShiftById, getShiftBySlug } = useTenantShifts();
  const { roles, hasRoles, getRoleById, getRoleBySlug } = useTenantRoles();
  const [formData, setFormData] = useState<{
    fullName: string;
    email: string;
    role: string;
    roleId: string;
    shiftId: string;
  }>({
    fullName: '',
    email: '',
    role: 'chatter',
    roleId: '',
    shiftId: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [shiftDropdownOpen, setShiftDropdownOpen] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);
  const shiftDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setRoleDropdownOpen(false);
      }
      if (shiftDropdownRef.current && !shiftDropdownRef.current.contains(event.target as Node)) {
        setShiftDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check if user can manage shifts and roles
  const canManageShifts = isOwner || hasPermission('settings.manage_roles') || teamMember?.role === 'admin';
  const canManageRoles = isOwner || hasPermission('settings.manage_roles') || teamMember?.role === 'admin';

  useEffect(() => {
    if (user) {
      // Determine the shift ID - prefer shift_id, fallback to finding by slug
      let shiftId = user.shift_id || '';
      if (!shiftId && user.shift) {
        const matchingShift = getShiftBySlug(user.shift);
        if (matchingShift) {
          shiftId = matchingShift.id;
        }
      }

      // Determine the role ID - prefer role_id, fallback to finding by legacy role name
      let roleId = user.role_id || '';
      if (!roleId && user.role) {
        const matchingRole = getRoleBySlug(user.role);
        if (matchingRole) {
          roleId = matchingRole.id;
        }
      }
      
      setFormData({
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        roleId: roleId,
        shiftId: shiftId,
      });
    }
  }, [user, getShiftBySlug, getRoleBySlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    if (formData.fullName.trim() && formData.email.trim()) {
      // Get the shift and role for backward compatibility slugs
      const selectedShift = formData.shiftId ? getShiftById(formData.shiftId) : null;
      const selectedRole = formData.roleId ? getRoleById(formData.roleId) : null;
      
      // Map custom role slugs to valid legacy enum values
      // The database trigger will handle syncing based on role_id
      let legacyRole = formData.role;
      if (selectedRole) {
        const validLegacyRoles = ['owner', 'admin', 'manager', 'chatter', 'pending'];
        if (validLegacyRoles.includes(selectedRole.slug)) {
          legacyRole = selectedRole.slug;
        } else {
          // For custom roles, map based on hierarchy level
          if (selectedRole.hierarchy_level >= 100) {
            legacyRole = 'owner';
          } else if (selectedRole.hierarchy_level >= 80) {
            legacyRole = 'admin';
          } else if (selectedRole.hierarchy_level >= 60) {
            legacyRole = 'manager';
          } else if (selectedRole.hierarchy_level >= 40) {
            legacyRole = 'chatter';
          } else {
            legacyRole = 'pending';
          }
        }
      }
      
      const { error } = await onSubmit(user.id, {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        role: legacyRole,
        roleId: formData.roleId || null,
        shift: selectedShift?.slug || undefined,
        shiftId: formData.shiftId || null,
      });
      
      if (error) {
        setError(error);
      } else {
        onClose();
      }
    }
    setLoading(false);
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      onClose();
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75" onClick={handleClose} />

        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3">
                <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Edit User
              </h3>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              disabled={loading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500"
                placeholder="Enter full name"
                disabled={loading}
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500"
                placeholder="Enter email address"
                disabled={loading}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role * {!canManageRoles && <span className="text-xs text-gray-500">(Admin only)</span>}
              </label>
              {hasRoles ? (
                <div className="relative" ref={roleDropdownRef}>
                  <button
                    type="button"
                    onClick={() => !loading && canManageRoles && setRoleDropdownOpen(!roleDropdownOpen)}
                    disabled={loading || !canManageRoles}
                    className={`w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-left text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm flex items-center justify-between gap-2 ${
                      !canManageRoles || loading
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-md cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {formData.roleId ? (
                        <>
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: getRoleById(formData.roleId)?.color || '#6B7280' }}
                          />
                          <span className="truncate font-medium">{getRoleById(formData.roleId)?.name}</span>
                        </>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">Select a role...</span>
                      )}
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                        roleDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {roleDropdownOpen && (
                    <div className="absolute z-50 w-full bottom-full mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
                      <div className="max-h-48 overflow-y-auto py-1">
                        {roles.map((role) => (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, roleId: role.id, role: role.slug });
                              setRoleDropdownOpen(false);
                            }}
                            className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between gap-2 transition-colors ${
                              formData.roleId === role.id
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }`}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div 
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: role.color }}
                              />
                              <div className="flex-1 min-w-0">
                                <span className="font-medium truncate block">{role.name}</span>
                                {role.description && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate block">
                                    {role.description}
                                  </span>
                                )}
                              </div>
                            </div>
                            {formData.roleId === role.id && (
                              <Check className="w-4 h-4 flex-shrink-0 text-blue-600" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    No custom roles have been configured yet.
                  </p>
                  {canManageRoles && (
                    <Link
                      to="/roles"
                      onClick={onClose}
                      className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Shield className="w-4 h-4 mr-1" />
                      Configure Roles
                    </Link>
                  )}
                </div>
              )}
              {!canManageRoles && hasRoles && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Only administrators can change user roles. You can edit other details.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Shift Schedule
              </label>
              {hasShifts ? (
                <div className="relative" ref={shiftDropdownRef}>
                  <button
                    type="button"
                    onClick={() => !loading && setShiftDropdownOpen(!shiftDropdownOpen)}
                    disabled={loading}
                    className={`w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-left text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm flex items-center justify-between gap-2 ${
                      loading
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-md cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      {formData.shiftId ? (
                        <div className="flex-1 min-w-0">
                          <span className="font-medium truncate block">{getShiftById(formData.shiftId)?.name}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 truncate block">
                            {formatTimeRange(
                              getShiftById(formData.shiftId)?.start_time || '',
                              getShiftById(formData.shiftId)?.end_time || ''
                            )}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">No Shift (Unassigned)</span>
                      )}
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                        shiftDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {shiftDropdownOpen && (
                    <div className="absolute z-50 w-full bottom-full mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
                      <div className="max-h-48 overflow-y-auto py-1">
                        {/* No Shift Option */}
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, shiftId: '' });
                            setShiftDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between gap-2 transition-colors ${
                            formData.shiftId === ''
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0" />
                            <span className="font-medium">No Shift (Unassigned)</span>
                          </div>
                          {formData.shiftId === '' && (
                            <Check className="w-4 h-4 flex-shrink-0 text-blue-600" />
                          )}
                        </button>

                        {/* Shift Options */}
                        {shifts.map((shift) => (
                          <button
                            key={shift.id}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, shiftId: shift.id });
                              setShiftDropdownOpen(false);
                            }}
                            className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between gap-2 transition-colors ${
                              formData.shiftId === shift.id
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                            }`}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div 
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: shift.color || '#6366f1' }}
                              />
                              <div className="flex-1 min-w-0">
                                <span className="font-medium truncate block">{shift.name}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 truncate block">
                                  {formatTimeRange(shift.start_time, shift.end_time)}
                                </span>
                              </div>
                            </div>
                            {formData.shiftId === shift.id && (
                              <Check className="w-4 h-4 flex-shrink-0 text-blue-600" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    No shifts have been configured yet.
                  </p>
                  {canManageShifts && (
                    <Link
                      to="/shifts"
                      onClick={onClose}
                      className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Configure Shifts
                    </Link>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </div>
                ) : (
                  'Update User'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditUserModal;