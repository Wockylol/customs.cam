import React, { useState, useEffect } from 'react';
import { X, AlertCircle, User } from 'lucide-react';
import { Database } from '../../lib/database.types';
import { useAuth } from '../../contexts/AuthContext';

type TeamMember = Database['public']['Tables']['team_members']['Row'];

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: TeamMember | null;
  onSubmit: (userId: string, userData: {
    fullName: string;
    email: string;
    role: 'admin' | 'manager' | 'chatter' | 'pending';
  }) => Promise<{ error: string | null }>;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, user, onSubmit }) => {
  const { teamMember } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    role: 'chatter' as 'admin' | 'manager' | 'chatter' | 'pending',
    shift: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        shift: user.shift || '',
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    if (formData.fullName.trim() && formData.email.trim()) {
      const { error } = await onSubmit(user.id, {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        role: formData.role,
        shift: formData.shift || undefined,
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

  // Check if current user is manager (not admin)
  const isManager = teamMember?.role === 'manager';

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
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role * {isManager && <span className="text-xs text-gray-500">(Admin only)</span>}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'chatter', label: 'Chatter', color: 'blue' },
                  { value: 'manager', label: 'Manager', color: 'purple' },
                  { value: 'admin', label: 'Admin', color: 'green' },
                  { value: 'pending', label: 'Pending', color: 'orange' }
                ].map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, role: role.value as any })}
                    disabled={loading || isManager}
                    className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 border-2 ${
                      isManager ? 'opacity-50 cursor-not-allowed' :
                      formData.role === role.value
                        ? role.color === 'blue' ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-md' :
                          role.color === 'purple' ? 'bg-purple-100 border-purple-500 text-purple-700 shadow-md' :
                          role.color === 'green' ? 'bg-green-100 border-green-500 text-green-700 shadow-md' :
                          'bg-orange-100 border-orange-500 text-orange-700 shadow-md'
                        : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
              {isManager && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Only administrators can change user roles. You can edit other details.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Shift Schedule
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: '', label: 'No Shift', time: 'Unassigned' },
                  { value: '10-6', label: 'Day Shift', time: '10am - 6pm' },
                  { value: '6-2', label: 'Evening Shift', time: '6pm - 2am' },
                  { value: '2-10', label: 'Night Shift', time: '2am - 10am' }
                ].map((shift) => (
                  <button
                    key={shift.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, shift: shift.value })}
                    disabled={loading}
                    className={`px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 border-2 text-center ${
                      formData.shift === shift.value
                        ? 'bg-indigo-100 border-indigo-500 text-indigo-700 shadow-md'
                        : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="font-semibold">{shift.label}</div>
                    <div className="text-xs opacity-75">{shift.time}</div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Assign a work shift schedule for this team member
              </p>
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