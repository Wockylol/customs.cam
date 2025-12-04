import React, { useState } from 'react';
import { X, Plus, Edit, Trash2, ExternalLink, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Database } from '../../lib/database.types';
import { usePlatforms } from '../../hooks/usePlatforms';
import { useClientPlatforms } from '../../hooks/useClientPlatforms';
import PlatformBadge from '../ui/PlatformBadge';

type Client = Database['public']['Tables']['clients']['Row'];
type Platform = Database['public']['Tables']['platforms']['Row'];

interface ManageClientPlatformsModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
}

const ManageClientPlatformsModal: React.FC<ManageClientPlatformsModalProps> = ({ 
  isOpen, 
  onClose, 
  client 
}) => {
  const { platforms } = usePlatforms();
  const { clientPlatforms, loading, addClientPlatform, updateClientPlatform, removeClientPlatform } = useClientPlatforms(client?.id);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    platformId: '',
    accountName: '',
    usernameOnPlatform: '',
    profileUrl: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !client) return null;

  // Allow all platforms since clients can have multiple accounts per platform
  const availablePlatforms = platforms;

  const handleAddPlatform = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.platformId) return;

    setSubmitting(true);
    setError(null);

    const { error } = await addClientPlatform(client.id, {
      platformId: formData.platformId,
      accountName: (formData.accountName || '').trim() || undefined,
      usernameOnPlatform: (formData.usernameOnPlatform || '').trim() || undefined,
      profileUrl: (formData.profileUrl || '').trim() || undefined,
      notes: (formData.notes || '').trim() || undefined
    });

    if (error) {
      setError(error);
    } else {
      setShowAddForm(false);
      setFormData({
        platformId: '',
        accountName: '',
        usernameOnPlatform: '',
        profileUrl: '',
        notes: ''
      });
    }

    setSubmitting(false);
  };

  const handleEditPlatform = async (clientPlatformId: string, updateData: {
    usernameOnPlatform?: string;
    profileUrl?: string;
    notes?: string;
  }) => {
    setSubmitting(true);
    setError(null);

    const { error } = await updateClientPlatform(clientPlatformId, updateData);

    if (error) {
      setError(error);
    } else {
      setEditingPlatform(null);
    }

    setSubmitting(false);
  };

  const handleRemovePlatform = async (clientPlatformId: string) => {
    if (!confirm('Are you sure you want to remove this platform?')) return;

    setSubmitting(true);
    setError(null);

    const { error } = await removeClientPlatform(clientPlatformId);

    if (error) {
      setError(error);
    }

    setSubmitting(false);
  };

  const handleClose = () => {
    setShowAddForm(false);
    setEditingPlatform(null);
    setFormData({
      platformId: '',
      usernameOnPlatform: '',
      profileUrl: '',
      notes: ''
    });
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={handleClose} />

        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Manage Platforms
                </h3>
                <p className="text-sm text-gray-600">@{client.username}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={submitting}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Current Platforms */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-semibold text-gray-900">
                Active Platforms ({clientPlatforms.length})
              </h4>
              {availablePlatforms.length > 0 && (
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  disabled={submitting}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Platform
                </button>
              )}
            </div>

            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Loading platforms...</p>
              </div>
            ) : clientPlatforms.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No platforms assigned</h3>
                <p className="text-gray-600">Add platforms to track where this client is managed.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {clientPlatforms.filter(cp => cp && cp.platform).map((clientPlatform) => (
                  <div key={clientPlatform.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <PlatformBadge 
                            platform={clientPlatform.platform!} 
                            size="md" 
                          />
                          {clientPlatform.username_on_platform && (
                            <span className="ml-3 text-sm font-medium text-gray-900">
                              @{clientPlatform.username_on_platform}
                            </span>
                          )}
                        </div>
                        
                        {editingPlatform === clientPlatform.id ? (
                          <EditPlatformForm
                            clientPlatform={clientPlatform}
                            onSave={(data) => handleEditPlatform(clientPlatform.id, data)}
                            onCancel={() => setEditingPlatform(null)}
                            loading={submitting}
                          />
                        ) : (
                          <>
                            {clientPlatform.profile_url && (
                              <div className="mb-2">
                                <a
                                  href={clientPlatform.profile_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                                >
                                  <ExternalLink className="w-4 h-4 mr-1" />
                                  View Profile
                                </a>
                              </div>
                            )}
                            
                            {clientPlatform.notes && (
                              <p className="text-sm text-gray-600 bg-white rounded p-2 border border-gray-200">
                                {clientPlatform.notes}
                              </p>
                            )}
                            
                            {clientPlatform.account_name && (
                              <span className="ml-2 text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                                {clientPlatform.account_name}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      
                      {editingPlatform !== clientPlatform.id && (
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => setEditingPlatform(clientPlatform.id)}
                            className="text-gray-400 hover:text-blue-600 p-1 rounded"
                            disabled={submitting}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemovePlatform(clientPlatform.id)}
                            className="text-gray-400 hover:text-red-600 p-1 rounded"
                            disabled={submitting}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Platform Form */}
          {showAddForm && availablePlatforms.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="text-md font-semibold text-blue-900 mb-4">Add New Platform</h4>
              <form onSubmit={handleAddPlatform} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Platform *
                  </label>
                  <select
                    value={formData.platformId}
                    onChange={(e) => setFormData({ ...formData, platformId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a platform</option>
                    {availablePlatforms.map((platform) => (
                      <option key={platform.id} value={platform.id}>
                        {platform.icon} {platform.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Name
                  </label>
                  <input
                    type="text"
                    value={formData.accountName}
                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g. Main Account, Backup Account"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Optional name to distinguish multiple accounts on the same platform
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username on Platform
                    </label>
                    <input
                      type="text"
                      value={formData.usernameOnPlatform}
                      onChange={(e) => setFormData({ ...formData, usernameOnPlatform: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g. sarah_star"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Profile URL
                    </label>
                    <input
                      type="url"
                      value={formData.profileUrl}
                      onChange={(e) => setFormData({ ...formData, profileUrl: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={2}
                    placeholder="Any additional notes about this platform..."
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={submitting || !formData.platformId}
                  >
                    {submitting ? (
                      <div className="flex items-center">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding...
                      </div>
                    ) : (
                      'Add Platform'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-gray-200 mt-6">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Edit Platform Form Component
interface EditPlatformFormProps {
  clientPlatform: any;
  onSave: (data: {
    usernameOnPlatform?: string;
    profileUrl?: string;
    notes?: string;
  }) => void;
  onCancel: () => void;
  loading: boolean;
}

const EditPlatformForm: React.FC<EditPlatformFormProps> = ({ 
  clientPlatform, 
  onSave, 
  onCancel, 
  loading 
}) => {
  const [formData, setFormData] = useState({
    accountName: clientPlatform.account_name || '',
    usernameOnPlatform: clientPlatform.username_on_platform || '',
    profileUrl: clientPlatform.profile_url || '',
    notes: clientPlatform.notes || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      accountName: formData.accountName.trim() || undefined,
      usernameOnPlatform: formData.usernameOnPlatform.trim() || undefined,
      profileUrl: formData.profileUrl.trim() || undefined,
      notes: formData.notes.trim() || undefined
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mt-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Account Name
        </label>
        <input
          type="text"
          value={formData.accountName}
          onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          placeholder="e.g. Main Account, Backup Account"
          disabled={loading}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Username on Platform
          </label>
          <input
            type="text"
            value={formData.usernameOnPlatform}
            onChange={(e) => setFormData({ ...formData, usernameOnPlatform: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder="e.g. sarah_star"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Profile URL
          </label>
          <input
            type="url"
            value={formData.profileUrl}
            onChange={(e) => setFormData({ ...formData, profileUrl: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            placeholder="https://..."
            disabled={loading}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          rows={2}
          placeholder="Any additional notes..."
          disabled={loading}
        />
      </div>

      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          {loading ? (
            <div className="flex items-center">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </div>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </form>
  );
};

export default ManageClientPlatformsModal;