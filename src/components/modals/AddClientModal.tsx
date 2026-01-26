import React, { useState } from 'react';
import { X, Building2 } from 'lucide-react';
import { useAgencies } from '../../hooks/useAgencies';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (clientData: { 
    username: string; 
    phone?: string;
    agencyId?: string;
    avatarUrl?: string;
  }) => Promise<{ error: string | null }>;
}

const AddClientModal: React.FC<AddClientModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const { agencies } = useAgencies();
  const [formData, setFormData] = useState({
    username: '',
    phone: '',
    agencyId: '',
    avatarUrl: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameValidationError, setUsernameValidationError] = useState<string | null>(null);

  // Validate username format (alphanumeric, underscores, periods, hyphens only)
  const validateUsername = (username: string): boolean => {
    const validUsernameRegex = /^[a-zA-Z0-9._-]+$/;
    if (!username) return true; // Allow empty for now, required validation will catch it
    if (!validUsernameRegex.test(username)) {
      setUsernameValidationError('Username can only contain letters, numbers, underscores, periods, and hyphens');
      return false;
    }
    setUsernameValidationError(null);
    return true;
  };

  const handleUsernameChange = (value: string) => {
    // Remove any spaces immediately
    const sanitized = value.replace(/\s/g, '');
    setFormData({ ...formData, username: sanitized });
    validateUsername(sanitized);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const trimmedUsername = formData.username.trim();
    
    // Validate username format before submitting
    if (!validateUsername(trimmedUsername)) {
      setLoading(false);
      return;
    }
    
    if (trimmedUsername) {
      const { error } = await onSubmit({
        username: trimmedUsername,
        phone: formData.phone.trim() || undefined,
        agencyId: formData.agencyId || undefined,
        avatarUrl: formData.avatarUrl.trim() || undefined,
      });
      
      if (error) {
        setError(error);
      } else {
        setFormData({ username: '', phone: '', agencyId: '', avatarUrl: '' });
        setUsernameValidationError(null);
        onClose();
      }
    }
    setLoading(false);
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({ username: '', phone: '', agencyId: '', avatarUrl: '' });
      setError(null);
      setUsernameValidationError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Add New Client
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username *
              </label>
              <input
                type="text"
                id="username"
                value={formData.username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent ${
                  usernameValidationError 
                    ? 'border-red-300 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="e.g. sarah_star"
                disabled={loading}
                required
              />
              {usernameValidationError && (
                <p className="mt-1 text-sm text-red-600">{usernameValidationError}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Only letters, numbers, underscores (_), periods (.), and hyphens (-) allowed
              </p>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g. (555) 123-4567"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="agencyId" className="block text-sm font-medium text-gray-700 mb-1">
                Agency (Optional)
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-600 z-10 pointer-events-none" />
                <div className="pl-8">
                  <select
                    id="agencyId"
                    value={formData.agencyId}
                    onChange={(e) => setFormData({ ...formData, agencyId: e.target.value })}
                    className="w-full px-3 py-2.5 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    <option value="">No agency</option>
                    {agencies.map((agency) => (
                      <option key={agency.id} value={agency.id}>
                        {agency.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="avatarUrl" className="block text-sm font-medium text-gray-700 mb-1">
                Avatar URL (Optional)
              </label>
              <input
                type="url"
                id="avatarUrl"
                value={formData.avatarUrl}
                onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com/avatar.jpg"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Upload to media/avatars bucket or provide external URL
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add Client'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddClientModal;