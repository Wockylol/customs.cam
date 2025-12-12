import React, { useState } from 'react';
import { Users, UserPlus, Search, Filter, Grid, List, Clock, CheckCircle, XCircle, Plus, Trash2, Edit, MessageSquare, History } from 'lucide-react';
import Layout from '../components/layout/Layout';
import ClientAvatar from '../components/ui/ClientAvatar';
import AssignChatterModal from '../components/modals/AssignChatterModal';
import AssignClientModal from '../components/modals/AssignClientModal';
import AssignmentHistoryModal from '../components/modals/AssignmentHistoryModal';
import { useChatterAssignments } from '../hooks/useChatterAssignments';
import { useTeamMembers } from '../hooks/useTeamMembers';
import { useClients } from '../hooks/useClients';
import { StaggerContainer } from '../components/ui/StaggerContainer';

const Assignments: React.FC = () => {
  const [viewMode, setViewMode] = useState<'chatters' | 'clients'>('chatters');
  const [searchTerm, setSearchTerm] = useState('');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [isAssignChatterModalOpen, setIsAssignChatterModalOpen] = useState(false);
  const [isAssignClientModalOpen, setIsAssignClientModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [selectedChatter, setSelectedChatter] = useState<any>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<{ type: 'chatter' | 'client'; id: string; name: string } | null>(null);

  const { assignments, loading, error, assignChatterToClient, removeAssignment } = useChatterAssignments();
  const { teamMembers } = useTeamMembers();
  const { clients } = useClients();

  // Get active chatters
  const chatters = teamMembers.filter(member => 
    member.role === 'chatter' && member.is_active
  );

  // Filter chatters based on search and shift
  const filteredChatters = chatters.filter(chatter => {
    const matchesSearch = searchTerm === '' || 
      chatter.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chatter.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesShift = shiftFilter === 'all' || chatter.shift === shiftFilter;
    
    return matchesSearch && matchesShift;
  }).sort((a, b) => a.full_name.localeCompare(b.full_name));

  // Filter clients based on search
  const filteredClients = clients.filter(client =>
    client.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.phone && client.phone.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a, b) => a.username.localeCompare(b.username));

  // Get assignments for a chatter
  const getChatterAssignments = (chatterId: string) => {
    return assignments.filter(assignment => assignment.chatter_id === chatterId);
  };

  // Get assignments for a client
  const getClientAssignments = (clientId: string) => {
    return assignments.filter(assignment => assignment.client_id === clientId);
  };

  // Handle assignment actions
  const handleAssignChatter = (client: any) => {
    setSelectedClient(client);
    setIsAssignChatterModalOpen(true);
  };

  const handleAssignClient = (chatter: any) => {
    setSelectedChatter(chatter);
    setIsAssignClientModalOpen(true);
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    const { error } = await removeAssignment(assignmentId);
    if (error) {
      console.error('Error removing assignment:', error);
    }
  };

  const handleAssignChatterToClient = async (chatterId: string, notes?: string) => {
    if (!selectedClient) return { error: 'No client selected' };
    
    const { error } = await assignChatterToClient(chatterId, selectedClient.id, notes, undefined);
    if (!error) {
      setIsAssignChatterModalOpen(false);
      setSelectedClient(null);
    }
    return { error };
  };

  const handleAssignClientToChatter = async (clientId: string, notes?: string) => {
    if (!selectedChatter) return { error: 'No chatter selected' };
    
    const { error } = await assignChatterToClient(selectedChatter.id, clientId, notes, undefined);
    if (!error) {
      setIsAssignClientModalOpen(false);
      setSelectedChatter(null);
    }
    return { error };
  };

  const handleShowHistory = (type: 'chatter' | 'client', id: string, name: string) => {
    setHistoryTarget({ type, id, name });
    setIsHistoryModalOpen(true);
  };

  const shifts = [
    { value: 'all', label: 'All Shifts' },
    { value: '10-6', label: 'Day Shift (10am-6pm)' },
    { value: '6-2', label: 'Evening Shift (6pm-2am)' },
    { value: '2-10', label: 'Night Shift (2am-10am)' }
  ];

  if (loading) {
    return (
      <Layout title="Assignments">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading assignments...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Assignments">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">Error loading assignments: {error}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Assignments">
      <StaggerContainer className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-6 lg:p-8 text-white shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4 backdrop-blur-sm">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold">Chatter Assignments</h1>
                <p className="text-blue-100 text-sm lg:text-base">Manage client-chatter relationships</p>
              </div>
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-1">
              <button
                onClick={() => setViewMode('chatters')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'chatters'
                    ? 'bg-white bg-opacity-30 text-white shadow-sm'
                    : 'text-blue-100 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4 mr-2" />
                By Chatters
              </button>
              <button
                onClick={() => setViewMode('clients')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'clients'
                    ? 'bg-white bg-opacity-30 text-white shadow-sm'
                    : 'text-blue-100 hover:text-white'
                }`}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                By Clients
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{chatters.length}</div>
              <div className="text-blue-100 text-sm">Active Chatters</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{clients.length}</div>
              <div className="text-blue-100 text-sm">Total Clients</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{assignments.length}</div>
              <div className="text-blue-100 text-sm">Active Assignments</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">
                {clients.filter(client => getClientAssignments(client.id).length === 0).length}
              </div>
              <div className="text-blue-100 text-sm">Unassigned Clients</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center mb-4">
            <Filter className="w-5 h-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            {/* Search */}
            <div className="relative flex items-center w-full md:w-80">
              <Search className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none z-10" />
              <input
                type="text"
                placeholder={`Search ${viewMode === 'chatters' ? 'chatters' : 'clients'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Shift Filter (only for chatters view) */}
            {viewMode === 'chatters' && (
              <div className="flex flex-wrap gap-2 flex-1">
                {shifts.map((shift) => (
                  <button
                    key={shift.value}
                    onClick={() => setShiftFilter(shift.value)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      shiftFilter === shift.value
                        ? shift.value === 'all' ? 'bg-gray-600 text-white shadow-md' :
                          shift.value === '10-6' ? 'bg-blue-600 text-white shadow-md' :
                          shift.value === '6-2' ? 'bg-purple-600 text-white shadow-md' :
                          'bg-indigo-600 text-white shadow-md'
                        : shift.value === 'all' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' :
                          shift.value === '10-6' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' :
                          shift.value === '6-2' ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' :
                          'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                    }`}
                  >
                    {shift.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {viewMode === 'chatters' ? (
          /* Chatters View */
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">
                Chatters and Their Assignments
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {filteredChatters.length} of {chatters.length} chatters
              </p>
            </div>

            {filteredChatters.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No chatters found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search terms.' : 'No active chatters in the system.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredChatters.map((chatter) => {
                  const chatterAssignments = getChatterAssignments(chatter.id);
                  
                  return (
                    <div key={chatter.id} className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{chatter.full_name}</h3>
                            <div className="flex items-center text-sm text-gray-500">
                              <Clock className="w-4 h-4 mr-1" />
                              {chatter.shift ? (
                                shifts.find(s => s.value === chatter.shift)?.label || chatter.shift
                              ) : (
                                'No shift assigned'
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-gray-600">
                            {chatterAssignments.length} client{chatterAssignments.length !== 1 ? 's' : ''}
                          </span>
                          <button
                            onClick={() => handleShowHistory('chatter', chatter.id, chatter.full_name)}
                            className="inline-flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                          >
                            <History className="w-4 h-4 mr-2" />
                            History
                          </button>
                          <button
                            onClick={() => handleAssignClient(chatter)}
                            className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Assign Client
                          </button>
                        </div>
                      </div>

                      {/* Assigned Clients */}
                      {chatterAssignments.length === 0 ? (
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <UserPlus className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">No clients assigned</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {chatterAssignments.map((assignment) => (
                            <div key={assignment.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200 max-w-xs">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <ClientAvatar 
                                    client={(assignment as any).client} 
                                    size="sm" 
                                    className="mr-2" 
                                  />
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      @{(assignment as any).client.username}
                                      {(assignment as any).client_platform && (
                                        <span className="ml-2 text-xs text-purple-600">
                                          {(assignment as any).client_platform.platform.icon} {(assignment as any).client_platform.platform.name}
                                          {(assignment as any).client_platform.account_name && ` - ${(assignment as any).client_platform.account_name}`}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Assigned {new Date(assignment.assigned_at).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleRemoveAssignment(assignment.id)}
                                  className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 flex-shrink-0"
                                  title="Remove assignment"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </div>
                              {assignment.notes && (
                                <p className="text-xs text-gray-600 bg-white rounded p-2 mt-2">
                                  {assignment.notes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Clients View */
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">
                Clients and Their Assigned Chatters
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {filteredClients.length} of {clients.length} clients
              </p>
            </div>

            {filteredClients.length === 0 ? (
              <div className="text-center py-12">
                <UserPlus className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No clients found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search terms.' : 'No clients in the system.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredClients.map((client) => {
                  const clientAssignments = getClientAssignments(client.id);
                  
                  return (
                    <div key={client.id} className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <ClientAvatar client={client} size="lg" className="mr-4" />
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">@{client.username}</h3>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-gray-600">
                            {clientAssignments.length} chatter{clientAssignments.length !== 1 ? 's' : ''}
                          </span>
                          <button
                            onClick={() => handleShowHistory('client', client.id, `@${client.username}`)}
                            className="inline-flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                          >
                            <History className="w-4 h-4 mr-2" />
                            History
                          </button>
                          <button
                            onClick={() => handleShowHistory('client', client.id, `@${client.username}`)}
                            className="inline-flex items-center px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                          >
                            <History className="w-4 h-4 mr-2" />
                            History
                          </button>
                          <button
                            onClick={() => handleAssignChatter(client)}
                            className="inline-flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Assign Chatter
                          </button>
                        </div>
                      </div>

                      {/* Assigned Chatters */}
                      {clientAssignments.length === 0 ? (
                        <div className="bg-gray-50 rounded-lg p-4 text-center">
                          <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">No chatters assigned</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {clientAssignments.map((assignment) => (
                            <div key={assignment.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200 max-w-xs">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-2">
                                    <Users className="w-4 h-4 text-purple-600" />
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {(assignment as any).chatter.full_name}
                                      {(assignment as any).client_platform && (
                                        <span className="ml-2 text-xs text-blue-600">
                                          {(assignment as any).client_platform.platform.icon} {(assignment as any).client_platform.platform.name}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {(assignment as any).chatter.shift ? (
                                        shifts.find(s => s.value === (assignment as any).chatter.shift)?.label || (assignment as any).chatter.shift
                                      ) : (
                                        'No shift'
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleRemoveAssignment(assignment.id)}
                                  className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 flex-shrink-0"
                                  title="Remove assignment"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </div>
                              {assignment.notes && (
                                <p className="text-xs text-gray-600 bg-white rounded p-2 mt-2">
                                  {assignment.notes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Modals */}
        <AssignChatterModal
          isOpen={isAssignChatterModalOpen}
          onClose={() => {
            setIsAssignChatterModalOpen(false);
            setSelectedClient(null);
          }}
          client={selectedClient}
          chatters={chatters}
          existingAssignments={selectedClient ? getClientAssignments(selectedClient.id) : []}
          onSubmit={handleAssignChatterToClient}
        />

        <AssignClientModal
          isOpen={isAssignClientModalOpen}
          onClose={() => {
            setIsAssignClientModalOpen(false);
            setSelectedChatter(null);
          }}
          chatter={selectedChatter}
          clients={clients}
          existingAssignments={selectedChatter ? getChatterAssignments(selectedChatter.id) : []}
          onSubmit={handleAssignClientToChatter}
        />

        <AssignmentHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => {
            setIsHistoryModalOpen(false);
            setHistoryTarget(null);
          }}
          target={historyTarget}
        />
      </StaggerContainer>
    </Layout>
  );
};

export default Assignments;