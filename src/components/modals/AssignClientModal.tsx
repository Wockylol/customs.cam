import React, { useState } from 'react';
import { X, Users, Search, Check, Clock, Layers, Filter, UserPlus } from 'lucide-react';
import ClientAvatar from '../ui/ClientAvatar';
import PlatformBadge from '../ui/PlatformBadge';
import { usePlatforms } from '../../hooks/usePlatforms';
import { supabase } from '../../lib/supabase';

interface AssignClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatter: any;
  clients: any[];
  existingAssignments: any[];
  onSubmit: (clientId: string, notes?: string, clientPlatformId?: string) => Promise<{ error: string | null }>;
}

const AssignClientModal: React.FC<AssignClientModalProps> = ({ 
  isOpen, 
  onClose, 
  chatter, 
  clients, 
  existingAssignments,
  onSubmit 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [selectedClientPlatformIds, setSelectedClientPlatformIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { platforms } = usePlatforms();
  
  // Get all client platforms for display as individual entries
  const [allClientPlatformsMap, setAllClientPlatformsMap] = useState<Record<string, any[]>>({});
  const [allClientPlatforms, setAllClientPlatforms] = useState<any[]>([]);
  
  // Fetch all client platforms
  React.useEffect(() => {
    const fetchAllClientPlatforms = async () => {
      try {
        const { data, error } = await supabase
          .from('client_platforms')
          .select(`
            id,
            client_id,
            account_name,
            username_on_platform,
            username_on_platform,
            platform:platforms(id, name, color, icon),
            client:clients(id, username, phone, avatar_url)
          `)
          .eq('is_active', true);

        if (error) {
          console.error('Error fetching all client platforms:', error);
          return;
        }

        // Group platforms by client_id
        const platformsMap: Record<string, any[]> = {};
        (data || []).forEach(cp => {
          if (!platformsMap[cp.client_id]) {
            platformsMap[cp.client_id] = [];
          }
          platformsMap[cp.client_id].push({
            id: cp.id,
            platform_id: cp.platform?.id,
            name: cp.platform?.name,
            color: cp.platform?.color,
            icon: cp.platform?.icon,
            account_name: cp.account_name,
            username_on_platform: cp.username_on_platform,
            client: cp.client
          });
        });

        setAllClientPlatformsMap(platformsMap);
        setAllClientPlatforms(data || []);
      } catch (err) {
        console.error('Error fetching all client platforms:', err);
      }
    };

    if (isOpen) {
      fetchAllClientPlatforms();
    }
  }, [isOpen]);


  if (!isOpen || !chatter) return null;

  // Get assigned client platform IDs
  const getAssignedClientPlatformIds = () => {
    const platformSpecificIds = existingAssignments
      .filter(assignment => assignment.client_platform_id)
      .map(assignment => assignment.client_platform_id);
    
    console.log('🎯 Platform-specific assigned IDs:', platformSpecificIds);
    return platformSpecificIds;
  };

  // Get assigned client IDs (for general assignments)
  const getAssignedClientIds = () => {
    const generalAssignmentClientIds = existingAssignments
      .filter(assignment => !assignment.client_platform_id)
      .map(assignment => assignment.client_id);
    
    console.log('🌐 General assignment client IDs:', generalAssignmentClientIds);
    return generalAssignmentClientIds;
  };

  const assignedClientPlatformIds = getAssignedClientPlatformIds();
  const assignedClientIds = getAssignedClientIds();

  // Create list of all platform accounts as individual entries (including assigned ones)
  const getAllPlatformEntries = () => {
    const entries: any[] = [];
    
    // Add each client platform as a separate entry
    allClientPlatforms.forEach(clientPlatform => {
      // Apply platform filter
      if (platformFilter !== 'all' && clientPlatform.platform?.id !== platformFilter) {
        return;
      }
      
      // Apply search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' ||
        (clientPlatform.client?.username || '').toLowerCase().includes(searchLower) ||
        (clientPlatform.username_on_platform || '').toLowerCase().includes(searchLower) ||
        (clientPlatform.account_name || '').toLowerCase().includes(searchLower);
      
      if (!matchesSearch) {
        return;
      }
      
      entries.push({
        type: 'platform_account',
        id: clientPlatform.id,
        client: clientPlatform.client,
        platform: clientPlatform.platform,
        account_name: clientPlatform.account_name,
        username_on_platform: clientPlatform.username_on_platform,
        isAssigned: assignedClientPlatformIds.includes(clientPlatform.id) || 
                   assignedClientIds.includes(clientPlatform.client_id)
      });
    });
    
    // Sort entries alphabetically by client username, then by platform name, then by account name
    return entries.sort((a, b) => {
      const clientCompare = (a.client?.username || '').localeCompare(b.client?.username || '');
      if (clientCompare !== 0) return clientCompare;
      
      const platformCompare = (a.platform?.name || '').localeCompare(b.platform?.name || '');
      if (platformCompare !== 0) return platformCompare;
      
      return (a.account_name || '').localeCompare(b.account_name || '');
    });
  };

  const availablePlatformEntries = getAllPlatformEntries();

  // Get currently assigned platform accounts for this chatter
  const getAssignedPlatformEntries = () => {
    console.log('🔍 Getting assigned platform entries...');
    console.log('📋 Existing assignments:', existingAssignments);
    console.log('🏢 All client platforms:', allClientPlatforms);
    
    const assignedEntries = [];
    
    for (const assignment of existingAssignments) {
      console.log('🔄 Processing assignment:', assignment);
      
      if (assignment.client_platform_id) {
        // Find the matching client platform
        const clientPlatform = allClientPlatforms.find(cp => cp.id === assignment.client_platform_id);
        console.log('🎯 Found client platform:', clientPlatform);
        
        if (clientPlatform) {
          assignedEntries.push({
            type: 'platform_account',
            id: clientPlatform.id,
            client: clientPlatform.client,
            platform: clientPlatform.platform,
            account_name: clientPlatform.account_name,
            username_on_platform: clientPlatform.username_on_platform,
            assignment: assignment
          });
        }
      } else {
        // General assignment (no specific platform)
        console.log('📝 General assignment found:', assignment);
        assignedEntries.push({
          type: 'general_assignment',
          id: `general-${assignment.id}`,
          client: assignment.client,
          platform: null,
          account_name: null,
          username_on_platform: null,
          assignment: assignment
        });
      }
    }
    
    console.log('✅ Final assigned platform entries:', assignedEntries);
    return assignedEntries;
  };

  const assignedPlatformEntries = getAssignedPlatformEntries();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedClientPlatformIds.length === 0) {
      setError('Please select at least one platform account');
      return;
    }

    setLoading(true);
    setError(null);
    
    // Assign each selected platform account
    let hasError = false;
    for (const clientPlatformId of selectedClientPlatformIds) {
      const platformEntry = allClientPlatforms.find(cp => cp.id === clientPlatformId);
      if (!platformEntry) continue;
      
      const { error } = await onSubmit(
        platformEntry.client_id, 
        notes.trim() || undefined, 
        clientPlatformId
      );
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
      setPlatformFilter('all');
      setSelectedClientPlatformIds([]);
      setNotes('');
      setError(null);
      onClose();
    }
  };

  const handlePlatformAccountToggle = (clientPlatformId: string) => {
    // Don't allow toggling of already assigned accounts
    const entry = availablePlatformEntries.find(e => e.id === clientPlatformId);
    if (entry?.isAssigned) {
      return;
    }
    
    setSelectedClientPlatformIds(prev => 
      prev.includes(clientPlatformId)
        ? prev.filter(id => id !== clientPlatformId)
        : [...prev, clientPlatformId]
    );
  };


  const shifts = [
    { value: '10-6', label: 'Day Shift (10am-6pm)' },
    { value: '6-2', label: 'Evening Shift (6pm-2am)' },
    { value: '2-10', label: 'Night Shift (2am-10am)' }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={handleClose} />

        <div className="inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <UserPlus className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Assign Client to Chatter
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

          {/* Chatter Info */}
          <div className="bg-purple-50 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h4 className="font-semibold text-purple-900">{chatter.full_name}</h4>
                <p className="text-sm text-purple-700">{chatter.email}</p>
                <div className="flex items-center text-xs text-purple-600 mt-1">
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

          {/* Currently Assigned Platform Accounts */}
          {(assignedPlatformEntries.length > 0 || existingAssignments.length > 0) && (
            <div className="bg-green-50 rounded-lg p-4 mb-6">
              <div className="flex items-center mb-3">
                <Users className="w-5 h-5 text-green-600 mr-2" />
                <h4 className="font-semibold text-green-900">
                  Currently Assigned ({assignedPlatformEntries.length} platform accounts, {existingAssignments.length} total assignments)
                </h4>
              </div>
              
              {assignedPlatformEntries.length === 0 && existingAssignments.length > 0 ? (
                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <p className="text-sm text-green-800 text-center">
                    This chatter has {existingAssignments.length} general assignment{existingAssignments.length !== 1 ? 's' : ''} (not platform-specific)
                  </p>
                </div>
              ) : assignedPlatformEntries.length > 0 ? (
                <div className="space-y-2">
                  {assignedPlatformEntries.map((entry) => (
                    <div key={entry.id} className="bg-white rounded-lg p-3 border border-green-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <ClientAvatar client={entry.client} size="sm" className="mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              @{entry.client.username}
                            </div>
                            {entry.platform ? (
                              <div className="flex items-center mt-1">
                                <span className="text-base mr-2">{entry.platform.icon}</span>
                                <div className="text-xs text-gray-600">
                                  <span className="font-medium">{entry.platform.name}</span>
                                  {entry.username_on_platform && (
                                    <span className="ml-1">• @{entry.username_on_platform}</span>
                                  )}
                                  {entry.account_name && (
                                    <span className="ml-1 text-gray-500">({entry.account_name})</span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-600 mt-1">
                                General assignment (all platforms)
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-green-700">
                          Assigned {new Date(entry.assignment.assigned_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <p className="text-sm text-green-800 text-center">
                    No platform-specific assignments yet
                  </p>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Search Clients */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search & Filter Available Clients
              </label>
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by username (main or platform-specific)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                {/* Platform Filter */}
                <div>
                  <div className="flex items-center mb-2">
                    <Filter className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-700">Filter by Platform</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPlatformFilter('all')}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        platformFilter === 'all'
                          ? 'bg-gray-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      All Platforms
                    </button>
                    {platforms.map((platform) => (
                      <button
                        key={platform.id}
                        type="button"
                        onClick={() => setPlatformFilter(platform.id)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${
                          platformFilter === platform.id
                            ? 'text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        style={platformFilter === platform.id ? { backgroundColor: platform.color } : {}}
                      >
                        {platform.icon && (
                          <span className="mr-2 text-base">{platform.icon}</span>
                        )}
                        {platform.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Client Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Platform Accounts * ({selectedClientPlatformIds.length} of {availablePlatformEntries.length} selected)
              </label>
              <p className="text-xs text-gray-600 mb-3">
                Each platform account is listed separately. Already assigned accounts are pre-selected and shown with a checkmark.
              </p>
              <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg">
                {availablePlatformEntries.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    {searchTerm || platformFilter !== 'all' ? 'No platform accounts found matching your filters' : 'No platform accounts available'}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {availablePlatformEntries.map((entry) => (
                      <label
                        key={entry.id}
                        className={`flex items-center p-3 cursor-pointer transition-colors ${
                          entry.isAssigned ? 'bg-green-50 hover:bg-green-100' :
                          selectedClientPlatformIds.includes(entry.id) ? 'bg-blue-50 hover:bg-blue-100' : 
                          'hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          value={entry.id}
                          checked={selectedClientPlatformIds.includes(entry.id) || entry.isAssigned}
                          onChange={() => handlePlatformAccountToggle(entry.id)}
                          disabled={entry.isAssigned}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                        />
                        <div className="flex items-center w-full min-w-0">
                          <ClientAvatar client={entry.client} size="sm" className="mr-3" />
                          <div className="flex-1 min-w-0">
                            <div>
                              {/* Main client username */}
                              <div className={`text-sm font-medium ${entry.isAssigned ? 'text-green-900' : 'text-gray-900'}`}>
                                @{entry.client.username}
                                {entry.isAssigned && (
                                  <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                    {assignedClientPlatformIds.includes(entry.id) ? 'Platform Assigned' : 'General Assignment'}
                                  </span>
                                )}
                              </div>
                              
                              {/* Platform-specific information */}
                              <div className="flex items-center mt-1">
                                <span className="text-base mr-2">{entry.platform.icon}</span>
                                <div className={`text-xs ${entry.isAssigned ? 'text-green-600' : 'text-gray-600'}`}>
                                  <span className="font-medium">{entry.platform.name}</span>
                                  {entry.username_on_platform && (
                                    <span className="ml-1">• @{entry.username_on_platform}</span>
                                  )}
                                  {entry.account_name && (
                                    <span className="ml-1 text-gray-500">({entry.account_name})</span>
                                  )}
                                </div>
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
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || selectedClientPlatformIds.length === 0}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Assigning {selectedClientPlatformIds.length} account{selectedClientPlatformIds.length !== 1 ? 's' : ''}...
                  </div>
                ) : (
                  `Assign ${selectedClientPlatformIds.length} Account${selectedClientPlatformIds.length !== 1 ? 's' : ''}`
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AssignClientModal;