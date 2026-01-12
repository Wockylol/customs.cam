import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, Plus, Edit2, Trash2, Save, X, 
  AlertTriangle, Users, GripVertical, Check
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { 
  useTenantShifts, 
  TenantShift,
  formatTimeRange,
  calculateShiftDuration,
  getShiftColorClasses
} from '../hooks/useTenantShifts';
import { supabase } from '../lib/supabase';

// Available colors for shifts
const SHIFT_COLORS = [
  { value: 'blue', label: 'Blue', bg: 'bg-blue-500' },
  { value: 'purple', label: 'Purple', bg: 'bg-purple-500' },
  { value: 'indigo', label: 'Indigo', bg: 'bg-indigo-500' },
  { value: 'green', label: 'Green', bg: 'bg-green-500' },
  { value: 'orange', label: 'Orange', bg: 'bg-orange-500' },
  { value: 'red', label: 'Red', bg: 'bg-red-500' },
  { value: 'teal', label: 'Teal', bg: 'bg-teal-500' },
  { value: 'pink', label: 'Pink', bg: 'bg-pink-500' },
];

interface ShiftFormData {
  name: string;
  slug: string;
  start_time: string;
  end_time: string;
  color: string;
}

const ShiftManagement: React.FC = () => {
  const { teamMember, hasPermission, isOwner } = useAuth();
  const { tenant } = useTenant();
  const { 
    shifts, 
    loading, 
    error, 
    hasShifts,
    createShift, 
    updateShift, 
    deleteShift,
    reorderShifts,
    fetchShifts
  } = useTenantShifts();

  // UI State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingShift, setEditingShift] = useState<TenantShift | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState<ShiftFormData>({
    name: '',
    slug: '',
    start_time: '09:00',
    end_time: '17:00',
    color: 'blue'
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [teamMemberCounts, setTeamMemberCounts] = useState<Record<string, number>>({});

  // Check permissions
  const canManageShifts = isOwner || hasPermission('settings.manage_roles') || teamMember?.role === 'admin';

  // Fetch team member counts for each shift
  useEffect(() => {
    if (!tenant?.id || shifts.length === 0) return;

    const fetchCounts = async () => {
      const counts: Record<string, number> = {};
      
      for (const shift of shifts) {
        // Count by shift_id first, then fallback to legacy shift slug
        const { count: byId } = await supabase
          .from('team_members')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id)
          .eq('shift_id', shift.id)
          .eq('is_active', true);

        const { count: bySlug } = await supabase
          .from('team_members')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id)
          .eq('shift', shift.slug)
          .is('shift_id', null)
          .eq('is_active', true);

        counts[shift.id] = (byId || 0) + (bySlug || 0);
      }
      
      setTeamMemberCounts(counts);
    };

    fetchCounts();
  }, [tenant?.id, shifts]);

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    
    setFormData(prev => ({ ...prev, name, slug }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      start_time: '09:00',
      end_time: '17:00',
      color: 'blue'
    });
    setFormError(null);
    setEditingShift(null);
    setShowCreateModal(false);
  };

  // Open edit modal
  const openEditModal = (shift: TenantShift) => {
    setEditingShift(shift);
    setFormData({
      name: shift.name,
      slug: shift.slug,
      start_time: shift.start_time.substring(0, 5), // Remove seconds
      end_time: shift.end_time.substring(0, 5),
      color: shift.color
    });
    setShowCreateModal(true);
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Shift name is required');
      return;
    }
    if (!formData.slug.trim()) {
      setFormError('Shift slug is required');
      return;
    }

    setSaving(true);

    try {
      if (editingShift) {
        // Update existing shift
        const { error } = await updateShift(editingShift.id, {
          name: formData.name.trim(),
          slug: formData.slug.trim(),
          start_time: formData.start_time + ':00',
          end_time: formData.end_time + ':00',
          color: formData.color
        });

        if (error) {
          setFormError(error);
          return;
        }
      } else {
        // Create new shift
        const { error } = await createShift({
          name: formData.name.trim(),
          slug: formData.slug.trim(),
          start_time: formData.start_time + ':00',
          end_time: formData.end_time + ':00',
          color: formData.color,
          display_order: shifts.length
        });

        if (error) {
          setFormError(error);
          return;
        }
      }

      resetForm();
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async (shiftId: string) => {
    const count = teamMemberCounts[shiftId] || 0;
    if (count > 0) {
      setFormError(`Cannot delete shift with ${count} team member(s) assigned. Reassign them first.`);
      setDeleteConfirm(null);
      return;
    }

    const { error } = await deleteShift(shiftId);
    if (error) {
      setFormError(error);
    }
    setDeleteConfirm(null);
  };

  // Loading state
  if (loading) {
    return (
      <Layout title="Shift Management">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading shifts...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Shift Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 lg:p-8 text-white shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4 backdrop-blur-sm">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold">Shift Management</h1>
                <p className="text-indigo-100 text-sm lg:text-base">
                  Configure work shifts for your team
                </p>
              </div>
            </div>
            {canManageShifts && (
              <button
                onClick={() => {
                  resetForm();
                  setShowCreateModal(true);
                }}
                className="flex items-center px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors backdrop-blur-sm"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Shift
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{shifts.length}</div>
              <div className="text-indigo-100 text-sm">Total Shifts</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">
                {Object.values(teamMemberCounts).reduce((a, b) => a + b, 0)}
              </div>
              <div className="text-indigo-100 text-sm">Assigned Members</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-3 text-center hidden lg:block">
              <div className="text-2xl font-bold">
                {shifts.length > 0 
                  ? Math.round(shifts.reduce((acc, s) => acc + calculateShiftDuration(s.start_time, s.end_time), 0) / shifts.length)
                  : 0}h
              </div>
              <div className="text-indigo-100 text-sm">Avg Duration</div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {(error || formError) && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-800 dark:text-red-400">{error || formError}</p>
              {formError && (
                <button 
                  onClick={() => setFormError(null)}
                  className="ml-auto text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!hasShifts && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Shifts Configured
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Create shift schedules for your team. Shifts are used for attendance tracking, 
              filtering, and scheduling.
            </p>
            {canManageShifts && (
              <button
                onClick={() => {
                  resetForm();
                  setShowCreateModal(true);
                }}
                className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Shift
              </button>
            )}
          </div>
        )}

        {/* Shifts List */}
        {hasShifts && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Configured Shifts
              </h2>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              <AnimatePresence>
                {shifts.map((shift, index) => {
                  const colorClasses = getShiftColorClasses(shift.color);
                  const duration = calculateShiftDuration(shift.start_time, shift.end_time);
                  const memberCount = teamMemberCounts[shift.id] || 0;

                  return (
                    <motion.div
                      key={shift.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {/* Color indicator & drag handle */}
                          <div className="flex items-center space-x-2">
                            <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                            <div className={`w-4 h-4 rounded-full ${colorClasses.bg.replace('600', '500')}`} />
                          </div>

                          {/* Shift info */}
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold text-gray-900 dark:text-white">
                                {shift.name}
                              </h3>
                              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                                {shift.slug}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                              <span className="flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                {formatTimeRange(shift.start_time, shift.end_time)}
                              </span>
                              <span>{duration}h shift</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          {/* Team member count */}
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <Users className="w-4 h-4 mr-1" />
                            <span>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                          </div>

                          {/* Actions */}
                          {canManageShifts && (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => openEditModal(shift)}
                                className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                title="Edit shift"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {deleteConfirm === shift.id ? (
                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={() => handleDelete(shift.id)}
                                    className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                    title="Confirm delete"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                    title="Cancel"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirm(shift.id)}
                                  className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                  title="Delete shift"
                                  disabled={memberCount > 0}
                                >
                                  <Trash2 className={`w-4 h-4 ${memberCount > 0 ? 'opacity-50 cursor-not-allowed' : ''}`} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Create/Edit Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75"
                  onClick={resetForm}
                />

                {/* Modal */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle bg-white dark:bg-gray-800 shadow-xl rounded-2xl"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mr-3">
                        <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {editingShift ? 'Edit Shift' : 'Create New Shift'}
                      </h3>
                    </div>
                    <button
                      onClick={resetForm}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Shift Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="e.g., Day Shift, Evening Shift"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        required
                      />
                    </div>

                    {/* Slug */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Slug *
                      </label>
                      <input
                        type="text"
                        value={formData.slug}
                        onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                        placeholder="e.g., day-shift, 10-6"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                        required
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Unique identifier. Use lowercase letters, numbers, and hyphens.
                      </p>
                    </div>

                    {/* Time Range */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Start Time *
                        </label>
                        <input
                          type="time"
                          value={formData.start_time}
                          onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          End Time *
                        </label>
                        <input
                          type="time"
                          value={formData.end_time}
                          onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          required
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      For overnight shifts, set end time before start time (e.g., 6:00 PM - 2:00 AM)
                    </p>

                    {/* Color */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Color
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {SHIFT_COLORS.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                            className={`w-8 h-8 rounded-full ${color.bg} transition-transform ${
                              formData.color === color.value 
                                ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' 
                                : 'hover:scale-110'
                            }`}
                            title={color.label}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Duration Preview */}
                    {formData.start_time && formData.end_time && (
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Shift Duration: {' '}
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {calculateShiftDuration(formData.start_time + ':00', formData.end_time + ':00')} hours
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                        disabled={saving}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            {editingShift ? 'Update Shift' : 'Create Shift'}
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
};

export default ShiftManagement;

