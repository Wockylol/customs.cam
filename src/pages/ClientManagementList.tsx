import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Plus, 
  AlertCircle, 
  Loader2, 
  Target, 
  UserPlus, 
  FileText, 
  CheckCircle, 
  Clock,
  Lock,
  LockOpen,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import ClientAvatar from '../components/ui/ClientAvatar';
import AddClientModal from '../components/modals/AddClientModal';
import { useClients } from '../hooks/useClients';
import { useAllClientsData } from '../hooks/useAllClientsData';
import { useAuth } from '../contexts/AuthContext';
import { useImagePreloader } from '../hooks/useImagePreloader';
import { supabase } from '../lib/supabase';
import { StaggerContainer } from '../components/ui/StaggerContainer';
import { Database } from '../lib/database.types';

type ClientStatus = Database['public']['Enums']['client_status'];

const STATUS_CONFIG: Record<ClientStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  lead: { label: 'Lead', color: 'text-purple-700 dark:text-purple-300', bgColor: 'bg-purple-100 dark:bg-purple-900/30', icon: <Target className="w-3 h-3" /> },
  prospect: { label: 'Prospect', color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-100 dark:bg-blue-900/30', icon: <UserPlus className="w-3 h-3" /> },
  pending_contract: { label: 'Pending', color: 'text-orange-700 dark:text-orange-300', bgColor: 'bg-orange-100 dark:bg-orange-900/30', icon: <FileText className="w-3 h-3" /> },
  active: { label: 'Active', color: 'text-green-700 dark:text-green-300', bgColor: 'bg-green-100 dark:bg-green-900/30', icon: <CheckCircle className="w-3 h-3" /> },
  inactive: { label: 'Inactive', color: 'text-gray-700 dark:text-gray-300', bgColor: 'bg-gray-100 dark:bg-gray-900/30', icon: <Clock className="w-3 h-3" /> },
  churned: { label: 'Churned', color: 'text-red-700 dark:text-red-300', bgColor: 'bg-red-100 dark:bg-red-900/30', icon: <AlertCircle className="w-3 h-3" /> },
};

const ClientManagementList: React.FC = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'all'>('all');
  const [sortField, setSortField] = useState<'name' | 'completion' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [clientPinStatus, setClientPinStatus] = useState<Record<string, boolean>>({});
  
  const { clients, loading, error, addClient } = useClients();
  const { clients: fullClientsData, loading: fullDataLoading } = useAllClientsData();
  const { teamMember } = useAuth();

  // Preload all client avatars for faster rendering
  useImagePreloader(clients.map(c => c.avatar_url));

  // Fetch PIN status for all clients
  useEffect(() => {
    const fetchPinStatuses = async () => {
      if (clients.length === 0) return;
      
      const clientIds = clients.map(c => c.id);
      const { data, error } = await supabase
        .from('client_pins')
        .select('client_id')
        .in('client_id', clientIds);
      
      if (!error && data) {
        const pinMap: Record<string, boolean> = {};
        data.forEach(pin => {
          pinMap[pin.client_id] = true;
        });
        setClientPinStatus(pinMap);
      }
    };
    
    fetchPinStatuses();
  }, [clients]);

  // Calculate completion percentage for a client
  const getCompletionPercentage = (clientId: string) => {
    const clientData = fullClientsData.find(c => c.id === clientId);
    if (!clientData) return 0;

    let filled = 0;
    let total = 0;

    // Personal info (5 fields)
    if (clientData.personal_info) {
      const fields = ['legal_name', 'email', 'phone', 'date_of_birth', 'address'];
      fields.forEach(field => {
        total++;
        if ((clientData.personal_info as any)?.[field]) filled++;
      });
    } else {
      total += 5;
    }

    // Questionnaire (26 main fields)
    if (clientData.questionnaire) {
      const fields = [
        'public_name', 'public_nicknames', 'public_birthday', 'gender',
        'native_language', 'other_languages', 'sexual_orientation', 'ethnicity',
        'height', 'weight', 'shoe_size', 'bra_size', 'zodiac_sign', 'favorite_colors',
        'birth_place', 'current_location', 'hobbies', 'college', 'current_car', 'dream_car',
        'pets', 'favorite_place_traveled', 'dream_destination', 'relationship_status',
        'dream_date', 'has_children'
      ];
      fields.forEach(field => {
        total++;
        if ((clientData.questionnaire as any)?.[field]) filled++;
      });
    } else {
      total += 26;
    }

    // Preferences (1 for having any)
    total++;
    if (clientData.preferences) filled++;

    // Personas (1 for having any)
    total++;
    if (clientData.personas.length > 0) filled++;

    return Math.round((filled / total) * 100);
  };

  const handleAddClient = async (clientData: { 
    username: string; 
    phone?: string;
    agencyId?: string;
  }) => {
    const { error } = await addClient({
      username: clientData.username,
      phone: clientData.phone,
      agencyId: clientData.agencyId
    });

    if (!error) {
      setIsModalOpen(false);
    }

    return { error };
  };

  const handleSort = (field: 'name' | 'completion') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortButton: React.FC<{ field: 'name' | 'completion'; children: React.ReactNode }> = ({ field, children }) => {
    const isActive = sortField === field;
    const isAsc = isActive && sortDirection === 'asc';
    
    return (
      <button
        onClick={() => handleSort(field)}
        className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none"
      >
        <span>{children}</span>
        <div className="flex flex-col">
          <ChevronUp 
            className={`w-3 h-3 ${isActive && isAsc ? 'text-blue-600' : 'text-gray-400'}`} 
          />
          <ChevronDown 
            className={`w-3 h-3 -mt-1 ${isActive && !isAsc ? 'text-blue-600' : 'text-gray-400'}`} 
          />
        </div>
      </button>
    );
  };

  // Get status counts
  const statusCounts = useMemo(() => {
    const counts: Record<ClientStatus | 'all', number> = {
      all: clients.length,
      lead: 0,
      prospect: 0,
      pending_contract: 0,
      active: 0,
      inactive: 0,
      churned: 0,
    };
    clients.forEach(client => {
      const status = (client as any).status as ClientStatus || 'active';
      if (counts[status] !== undefined) {
        counts[status]++;
      }
    });
    return counts;
  }, [clients]);

  // Filter and sort clients
  const filteredAndSortedClients = useMemo(() => {
    let filtered = clients;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(client => {
        const status = (client as any).status as ClientStatus || 'active';
        return status === statusFilter;
      });
    }

    // Apply search filter
    filtered = filtered.filter(client =>
      client.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.phone && client.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
      ((client as any).first_name && (client as any).first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      ((client as any).last_name && (client as any).last_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      ((client as any).email && (client as any).email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Apply sorting
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortField) {
          case 'name':
            aValue = (a as any).first_name || a.username;
            bValue = (b as any).first_name || b.username;
            break;
          case 'completion':
            aValue = getCompletionPercentage(a.id);
            bValue = getCompletionPercentage(b.id);
            break;
          default:
            return 0;
        }

        if (sortDirection === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });
    } else {
      // Default alphabetical sort by username
      filtered.sort((a, b) => a.username.localeCompare(b.username));
    }

    return filtered;
  }, [clients, searchTerm, sortField, sortDirection, statusFilter, fullClientsData]);

  if (loading || fullDataLoading) {
    return (
      <Layout title="Client Management">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading clients...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Client Management">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800 dark:text-red-200">Error loading clients: {error}</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Client Management">
      <StaggerContainer className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 lg:p-8 text-white shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4 backdrop-blur-sm">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold">Client Management</h1>
                <p className="text-indigo-100 text-sm lg:text-base">Manage all client information and contracts</p>
              </div>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-white text-indigo-700 font-medium rounded-lg hover:bg-indigo-50 transition-colors shadow-md"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Client
            </button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="text-indigo-100 text-sm mb-1">Total Clients</div>
              <div className="text-2xl font-bold">{clients.length}</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="text-indigo-100 text-sm mb-1">Active</div>
              <div className="text-2xl font-bold">{statusCounts.active}</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="text-indigo-100 text-sm mb-1">Leads</div>
              <div className="text-2xl font-bold">{statusCounts.lead + statusCounts.prospect}</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="text-indigo-100 text-sm mb-1">PIN Enabled</div>
              <div className="text-2xl font-bold">{Object.keys(clientPinStatus).length}</div>
            </div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-4">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All ({statusCounts.all})
          </button>
          {(Object.keys(STATUS_CONFIG) as ClientStatus[]).map((status) => {
            const config = STATUS_CONFIG[status];
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  statusFilter === status
                    ? `${config.bgColor} ${config.color}`
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {config.icon}
                {config.label} ({statusCounts[status]})
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              type="text"
              placeholder="Search by username, name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Clients Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <SortButton field="name">Client</SortButton>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    PIN
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <SortButton field="completion">Completion</SortButton>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAndSortedClients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <Users className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                      <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No clients found</h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first client.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedClients.map((client) => {
                    const clientStatus = ((client as any).status as ClientStatus) || 'active';
                    const statusConfig = STATUS_CONFIG[clientStatus];
                    const hasPin = clientPinStatus[client.id] || false;
                    const completion = getCompletionPercentage(client.id);
                    
                    return (
                      <tr 
                        key={client.id} 
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                        onClick={() => navigate(`/client-management/${client.id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <ClientAvatar client={client} size="md" />
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {(client as any).first_name || (client as any).last_name 
                                  ? `${(client as any).first_name || ''} ${(client as any).last_name || ''}`.trim()
                                  : `@${client.username}`
                                }
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                @{client.username}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                            {statusConfig.icon}
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-gray-100">
                            {(client as any).email || client.phone || <span className="text-gray-400">No contact</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {hasPin ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                              <Lock className="w-3 h-3" />
                              Set
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                              <LockOpen className="w-3 h-3" />
                              Not Set
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  completion >= 80 ? 'bg-green-500' :
                                  completion >= 50 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${completion}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-600 dark:text-gray-400 w-10">
                              {completion}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </StaggerContainer>

      <AddClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddClient}
      />
    </Layout>
  );
};

export default ClientManagementList;

