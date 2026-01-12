import React, { useState, useEffect } from 'react';
import { X, AlertCircle, User, Settings, Shield } from 'lucide-react';
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
      
      const { error } = await onSubmit(user.id, {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        role: selectedRole?.slug || formData.role, // Use role slug for legacy column
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

        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-lg">
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Dynamic Role Options */}
                    {roles.map((role) => {
                      const isSelected = formData.roleId === role.id;
                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, roleId: role.id, role: role.slug })}
                          disabled={loading || !canManageRoles}
                          className={`px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 border-2 text-center ${
                            !canManageRoles ? 'opacity-50 cursor-not-allowed' :
                            isSelected
                              ? 'shadow-md'
                              : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                          }`}
                          style={isSelected ? {
                            backgroundColor: `${role.color}20`,
                            borderColor: role.color,
                            color: role.color,
                          } : undefined}
                        >
                          <div className="flex items-center justify-center">
                            <div 
                              className="w-2.5 h-2.5 rounded-full mr-2"
                              style={{ backgroundColor: role.color }}
                            />
                            <span className="font-semibold">{role.name}</span>
                          </div>
                          {role.description && (
                            <div className="text-xs opacity-75 mt-0.5 truncate">{role.description}</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Assign a role to define permissions for this team member
                  </p>
                </>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
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
              {!canManageRoles && (
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
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {/* No Shift Option */}
                    <button
                      key="no-shift"
                      type="button"
                      onClick={() => setFormData({ ...formData, shiftId: '' })}
                      disabled={loading}
                      className={`px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 border-2 text-center ${
                        formData.shiftId === ''
                          ? 'bg-gray-100 dark:bg-gray-600 border-gray-500 text-gray-700 dark:text-gray-200 shadow-md'
                          : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="font-semibold">No Shift</div>
                      <div className="text-xs opacity-75">Unassigned</div>
                    </button>
                    
                    {/* Dynamic Shift Options */}
                    {shifts.map((shift) => (
                      <button
                        key={shift.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, shiftId: shift.id })}
                        disabled={loading}
                        className={`px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 border-2 text-center ${
                          formData.shiftId === shift.id
                            ? 'bg-indigo-100 border-indigo-500 text-indigo-700 shadow-md'
                            : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                        }`}
                      >
                        <div className="font-semibold">{shift.name}</div>
                        <div className="text-xs opacity-75">{formatTimeRange(shift.start_time, shift.end_time)}</div>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Assign a work shift schedule for this team member
                  </p>
                </>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
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
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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