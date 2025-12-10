import React, { useState } from 'react';
import { X, Users, Search, Check, Clock, Layers } from 'lucide-react';
import ClientAvatar from '../ui/ClientAvatar';
import PlatformBadge from '../ui/PlatformBadge';
import ModernSelect from '../ui/ModernSelect';
import { useClientPlatforms } from '../../hooks/useClientPlatforms';

interface AssignChatterModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: any;
  chatters: any[];
  existingAssignments: any[];
  onSubmit: (chatterId: string, notes?: string, clientPlatformId?: string) => Promise<{ error: string | null }>;
}

const AssignChatterModal: React.FC<AssignChatterModalProps> = ({ 
  isOpen, 
  onClose, 
  client, 
  chatters, 
  existingAssignments,
  onSubmit 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [selectedChatterIds, setSelectedChatterIds] = useState<string[]>([]);
  const [selectedPlatformId, setSelectedPlatformId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { clientPlatforms } = useClientPlatforms(client?.id);

  if (!isOpen || !client) return null;

  // Get assigned chatter IDs for the selected platform (or general assignments)
  const getAssignedChatterIds = () => {
    if (selectedPlatformId) {
      // For platform-specific assignments, only exclude chatters assigned to this specific platform
      return existingAssignments
        .filter(assignment => assignment.client_platform_id === selectedPlatformId)
        .map(assignment => assignment.chatter_id);
    } else {
      // For general assignments, exclude chatters with general assignments (no platform)
      return existingAssignments
        .filter(assignment => !assignment.client_platform_id)
        .map(assignment => assignment.chatter_id);
    }
  };

  const assignedChatterIds = getAssignedChatterIds();

  // Filter available chatters (not already assigned)
  const availableChatters = chatters.filter(chatter => 
    !assignedChatterIds.includes(chatter.id) &&
    (shiftFilter === 'all' || chatter.shift === shiftFilter) &&
    (searchTerm === '' || 
     chatter.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedChatterIds.length === 0) {
      setError('Please select at least one chatter');
      return;
    }

    setLoading(true);
    setError(null);
    
    // Assign each selected chatter
    let hasError = false;
    for (const chatterId of selectedChatterIds) {
      const { error } = await onSubmit(chatterId, notes.trim() || undefined, selectedPlatformId || undefined);
      if (error) {
        setError(error);
        hasError = true;
        break;
      }
    }
    
    if (!hasError) {
      handleClose();
    }
    
    setLoading(false);
  };

  const handleClose = () => {
    if (!loading) {
      setSearchTerm('');
      setShiftFilter('all');
      setPlatformFilter('all');
      setSelectedChatterIds([]);
      setSelectedPlatformId('');
      setNotes('');
      setError(null);
      onClose();
    }
  };

  const handleChatterToggle = (chatterId: string) => {
    setSelectedChatterIds(prev => 
      prev.includes(chatterId)
        ? prev.filter(id => id !== chatterId)
        : [...prev, chatterId]
    );
  };

  const shifts = [
    { value: 'all', label: 'All Shifts' },
    { value: '10-6', label: 'Day Shift (10am-6pm)' },
    { value: '6-2', label: 'Evening Shift (6pm-2am)' },
    { value: '2-10', label: 'Night Shift (2am-10am)' }
  ];

  const platformOptions = [
    { value: '', label: 'General assignment (all platforms)' },
    ...clientPlatforms.map((cp) => ({
      value: cp.id,
      label: `${cp.platform?.icon} ${cp.platform?.name}${cp.account_name ? ` - ${cp.account_name}` : ''}${cp.username_on_platform ? ` (@${cp.username_on_platform})` : ''}`
    }))
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={handleClose} />

        <div className="inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Assign Chatter to Client
              </h3>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Client Info */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <ClientAvatar client={client} size="md" className="mr-3" />
              <div>
                <h4 className="font-semibold text-blue-900">@{client.username}</h4>
              </div>
            </div>
          </div>

          {/* Platform Selection */}
          <div className="bg-purple-50 rounded-lg p-4 mb-6">
            <div className="flex items-center mb-3">
              <Layers className="w-5 h-5 text-purple-600 mr-2" />
              <h4 className="font-semibold text-purple-900">Platform Assignment</h4>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign to specific platform account (optional)
                </label>
                <div className="relative">
                  <Layers className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-600 z-10 pointer-events-none" />
                  <div className="pl-8">
                    <select
                      value={selectedPlatformId}
                      onChange={(e) => setSelectedPlatformId(e.target.value)}
                      className="w-full px-3 py-2.5 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white hover:bg-purple-50 transition-colors"
                    >
                      {platformOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-purple-700 mt-1">
                  {selectedPlatformId 
                    ? 'Chatter will be assigned to this specific platform account'
                    : 'Chatter will handle all platforms for this client'
                  }
                </p>
              </div>
              
              {selectedPlatformId && (
                <div className="bg-white rounded-lg p-3 border border-purple-200">
                  {(() => {
                    const selectedPlatform = clientPlatforms.find(cp => cp.id === selectedPlatformId);
                    return selectedPlatform ? (
                      <div className="flex items-center">
                        <PlatformBadge platform={selectedPlatform.platform!} size="sm" className="mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {selectedPlatform.account_name || selectedPlatform.platform?.name}
                          </div>
                          {selectedPlatform.username_on_platform && (
                            <div className="text-xs text-gray-600">
                              @{selectedPlatform.username_on_platform}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Search Chatters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search & Filter Available Chatters
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-600 z-10 pointer-events-none" />
                  <div className="pl-8">
                    <select
                      value={shiftFilter}
                      onChange={(e) => setShiftFilter(e.target.value)}
                      className="w-full px-3 py-2.5 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white hover:bg-blue-50 transition-colors"
                    >
                      {shifts.map((shift) => (
                        <option key={shift.value} value={shift.value}>
                          {shift.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Chatter Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Chatters * ({selectedChatterIds.length} of {availableChatters.length} selected)
              </label>
              <p className="text-xs text-gray-600 mb-3">
                {selectedPlatformId 
                  ? `Assigning to ${clientPlatforms.find(cp => cp.id === selectedPlatformId)?.platform?.name} account`
                  : 'General assignment for all platforms'
                }
              </p>
              <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg">
                {availableChatters.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    {searchTerm || shiftFilter !== 'all' ? 'No chatters found matching your filters' : 
                     selectedPlatformId ? 'All chatters are already assigned to this platform' : 'All chatters are already assigned to this client'}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {availableChatters.map((chatter) => (
                      <label
                        key={chatter.id}
                        className={`flex items-center p-3 hover:bg-gray-50 cursor-pointer ${
                          selectedChatterIds.includes(chatter.id) ? 'bg-blue-50' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          value={chatter.id}
                          checked={selectedChatterIds.includes(chatter.id)}
                          onChange={() => handleChatterToggle(chatter.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                        />
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                              <Users className="w-4 h-4 text-gray-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {chatter.full_name}
                              </div>
                              <div className="flex items-center text-xs text-gray-500 mt-1">
                                <Clock className="w-3 h-3 mr-1" />
                                {chatter.shift ? (
                                  shifts.find(s => s.value === chatter.shift)?.label || chatter.shift
                                ) : (
                                  'No shift assigned'
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Any special instructions or notes about this assignment..."
                disabled={loading}
              />
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
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || selectedChatterIds.length === 0}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Assigning {selectedChatterIds.length} chatter{selectedChatterIds.length !== 1 ? 's' : ''}...
                  </div>
                ) : (
                  `Assign ${selectedChatterIds.length} Chatter${selectedChatterIds.length !== 1 ? 's' : ''}`
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AssignChatterModal;