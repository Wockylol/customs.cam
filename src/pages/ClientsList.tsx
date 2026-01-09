import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, ExternalLink, Users, AlertCircle, Loader2, Edit, Trash2, MoreVertical, Search, ChevronUp, ChevronDown, MessageCircle, Settings, Target, UserPlus, FileText, CheckCircle, Clock } from 'lucide-react';
import Layout from '../components/layout/Layout';
import ClientAvatar from '../components/ui/ClientAvatar';
import PlatformBadge from '../components/ui/PlatformBadge';
import AddClientModal from '../components/modals/AddClientModal';
import EditClientModal from '../components/modals/EditClientModal';
import DeleteClientModal from '../components/modals/DeleteClientModal';
import ManageClientPlatformsModal from '../components/modals/ManageClientPlatformsModal';
import { useClients } from '../hooks/useClients';
import { useClientPlatforms } from '../hooks/useClientPlatforms';
import { usePlatforms } from '../hooks/usePlatforms';
import { useCustomRequests } from '../hooks/useCustomRequests';
import { useChatterAssignments } from '../hooks/useChatterAssignments';
import { useImagePreloader } from '../hooks/useImagePreloader';
import { useAuth } from '../contexts/AuthContext';
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

const ClientsList: React.FC = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [platformsModalOpen, setPlatformsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'all'>('all');
  const [sortField, setSortField] = useState<'customCount' | 'totalPaid' | 'totalPending' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const { clients, loading, error, addClient, updateClient, deleteClient } = useClients();
  
  // Preload all client avatars for faster rendering
  useImagePreloader(clients.map(c => c.avatar_url));
  const { platforms } = usePlatforms();
  const { customRequests } = useCustomRequests();
  const { assignments } = useChatterAssignments();
  const { teamMember } = useAuth();
  const [clientThreads, setClientThreads] = useState<Record<string, number>>({});
  const [threadsLoading, setThreadsLoading] = useState(true);

  // Hook to get client platforms for display
  const [clientPlatformsMap, setClientPlatformsMap] = useState<Record<string, any[]>>({});

  // Fetch platforms for all clients
  const fetchAllClientPlatforms = React.useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('client_platforms')
        .select(`
          client_id,
          account_name,
          platform:platforms(id, name, color, icon)
        `)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching client platforms:', error);
        return;
      }

      // Group platforms by client_id
      const platformsMap: Record<string, any[]> = {};
      (data || []).forEach(cp => {
        if (!platformsMap[cp.client_id]) {
          platformsMap[cp.client_id] = [];
        }
        platformsMap[cp.client_id].push({
          ...cp.platform,
          account_name: cp.account_name
        });
      });

      setClientPlatformsMap(platformsMap);
    } catch (err) {
      console.error('Error fetching client platforms:', err);
    }
  }, []);

  React.useEffect(() => {
    fetchAllClientPlatforms();
  }, [fetchAllClientPlatforms]);

  const handlePlatformsModalClose = () => {
    setPlatformsModalOpen(false);
    setSelectedClient(null);
    // Refresh platforms data when modal closes
    fetchAllClientPlatforms();
  };

  // Fetch threads for all clients
  React.useEffect(() => {
    const fetchClientThreads = async () => {
      try {
        setThreadsLoading(true);
        const { data: threads, error } = await supabase
          .from('threads')
          .select('id, client_id')
          .not('client_id', 'is', null);

        if (error) {
          console.error('Error fetching threads:', error);
          return;
        }

        // Create mapping of client_id to thread_id
        const threadMap: Record<string, number> = {};
        (threads || []).forEach(thread => {
          if (thread.client_id) {
            threadMap[thread.client_id] = thread.id;
          }
        });

        setClientThreads(threadMap);
      } catch (err) {
        console.error('Error fetching client threads:', err);
      } finally {
        setThreadsLoading(false);
      }
    };

    fetchClientThreads();
  }, []);
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

  const handleEditClient = async (clientId: string, clientData: { 
    username: string; 
    phone?: string;
    agencyId?: string;
    avatarUrl?: string;
  }) => {
    const { error } = await updateClient(clientId, {
      username: clientData.username,
      phone: clientData.phone,
      agencyId: clientData.agencyId,
      avatarUrl: clientData.avatarUrl
    });
    if (!error) {
      setEditModalOpen(false);
      setSelectedClient(null);
    }
    return { error };
  };

  const handleDeleteClient = async (clientId: string) => {
    const { error } = await deleteClient(clientId);
    if (!error) {
      setDeleteModalOpen(false);
      setSelectedClient(null);
    }
    return { error };
  };

  const openEditModal = (client: any) => {
    setSelectedClient(client);
    setEditModalOpen(true);
    setDropdownOpen(null);
  };

  const openDeleteModal = (client: any) => {
    setSelectedClient(client);
    setDeleteModalOpen(true);
    setDropdownOpen(null);
  };

  const openPlatformsModal = (client: any) => {
    setSelectedClient(client);
    setPlatformsModalOpen(true);
    setDropdownOpen(null);
  };

  const toggleDropdown = (clientId: string) => {
    setDropdownOpen(dropdownOpen === clientId ? null : clientId);
  };

  const handleSort = (field: 'customCount' | 'totalPaid' | 'totalPending') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortButton: React.FC<{ field: 'customCount' | 'totalPaid' | 'totalPending'; children: React.ReactNode }> = ({ field, children }) => {
    const isActive = sortField === field;
    const isAsc = isActive && sortDirection === 'asc';
    
    return (
      <button
        onClick={() => handleSort(field)}
        className="flex items-center space-x-1 hover:text-gray-700 focus:outline-none"
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

  // Get incomplete custom count for each client
  const getCustomCount = (clientId: string) => {
    return customRequests.filter(custom => 
      custom.client_id === clientId && 
      (custom.status === 'pending_team_approval' || 
       custom.status === 'pending_client_approval' || 
       custom.status === 'in_progress')
    ).length;
  };

  // Get total paid amount for each client
  const getTotalPaidAmount = (clientId: string) => {
    return customRequests
      .filter(custom => custom.client_id === clientId)
      .reduce((sum, custom) => sum + (custom.amount_paid || 0), 0);
  };

  // Get total pending amount for each client
  const getTotalPendingAmount = (clientId: string) => {
    return customRequests
      .filter(custom => 
        custom.client_id === clientId && 
        (custom.status === 'pending_team_approval' || 
         custom.status === 'pending_client_approval' || 
         custom.status === 'in_progress')
      )
      .reduce((sum, custom) => sum + (custom.proposed_amount || 0), 0);
  };

  // Get status counts
  const statusCounts = React.useMemo(() => {
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
  const filteredAndSortedClients = React.useMemo(() => {
    let filtered = clients;

    // If user is a chatter, only show assigned clients
    if (teamMember?.role === 'chatter') {
      const assignedClientIds = assignments
        .filter(a => a.chatter_id === teamMember.id && a.is_active)
        .map(a => a.client_id);
      filtered = filtered.filter(client => assignedClientIds.includes(client.id));
    }

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

    // Apply platform filter
    if (platformFilter !== 'all') {
      filtered = filtered.filter(client => {
        const clientPlatforms = clientPlatformsMap[client.id] || [];
        return clientPlatforms.some(platform => platform.id === platformFilter);
      });
    }

    if (sortField) {
      filtered.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortField) {
          case 'customCount':
            aValue = getCustomCount(a.id);
            bValue = getCustomCount(b.id);
            break;
          case 'totalPaid':
            aValue = getTotalPaidAmount(a.id);
            bValue = getTotalPaidAmount(b.id);
            break;
          case 'totalPending':
            aValue = getTotalPendingAmount(a.id);
            bValue = getTotalPendingAmount(b.id);
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
      // Default alphabetical sort by username when no sort field is selected
      filtered.sort((a, b) => a.username.localeCompare(b.username));
    }

    return filtered;
  }, [clients, customRequests, searchTerm, sortField, sortDirection, teamMember, assignments, clientPlatformsMap, platformFilter, statusFilter]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      setDropdownOpen(null);
    };

    if (dropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [dropdownOpen]);
  if (loading) {
    return (
      <Layout title="Clients">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading clients...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Clients">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">Error loading clients: {error}</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Clients">
      <StaggerContainer className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Users className="w-6 h-6 text-gray-400 mr-2" />
            <span className="text-lg text-gray-600">{filteredAndSortedClients.length} of {clients.length} clients</span>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Client
          </button>
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
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
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
          
          {/* Platform Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Platform
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setPlatformFilter('all')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  platformFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                All Platforms
              </button>
              {platforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => setPlatformFilter(platform.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${
                    platformFilter === platform.id
                      ? 'text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
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

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Platforms
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <SortButton field="customCount">Incomplete</SortButton>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <SortButton field="totalPaid">Total Paid</SortButton>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <SortButton field="totalPending">Total Pending</SortButton>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAndSortedClients.map((client) => {
                const clientStatus = ((client as any).status as ClientStatus) || 'active';
                const statusConfig = STATUS_CONFIG[clientStatus];
                
                return (
                <tr 
                  key={client.id} 
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  onClick={() => navigate(`/client-profile/${client.id}`)}
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
                    <div className="flex flex-wrap gap-1">
                      {clientPlatformsMap[client.id]?.slice(0, 5).map((platform, index) => (
                        <div key={index} className="flex items-center" title={`${platform.name}${platform.account_name ? ` - ${platform.account_name}` : ''}`}>
                          {platform.icon ? (
                            <span className="text-lg">{platform.icon}</span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                              {platform.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                      )) || (
                        <span className="text-xs text-gray-400">No platforms</span>
                      )}
                      {clientPlatformsMap[client.id]?.length > 5 && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          +{clientPlatformsMap[client.id].length - 5}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {getCustomCount(client.id)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                    ${getTotalPaidAmount(client.id).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                    ${getTotalPendingAmount(client.id).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/clients/${client.username}`}
                        className="text-blue-600 hover:text-blue-800 inline-flex items-center"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Customs
                      </Link>
                      {teamMember?.role === 'admin' && (
                        <Link
                          to={clientThreads[client.id] ? `/chats?thread=${clientThreads[client.id]}` : '#'}
                          className={`inline-flex items-center ${
                            clientThreads[client.id] 
                              ? 'text-purple-600 hover:text-purple-800' 
                              : 'text-gray-400 cursor-not-allowed'
                          }`}
                          onClick={(e) => {
                            if (!clientThreads[client.id]) {
                              e.preventDefault();
                            }
                          }}
                          title={clientThreads[client.id] ? 'Open chat thread' : 'No chat thread found'}
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          Chat
                        </Link>
                      )}
                      <Link
                        to={`/app/${client.username}`}
                        className="text-green-600 hover:text-green-800 inline-flex items-center"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Portal
                      </Link>
                      
                      {/* Dropdown Menu */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDropdown(client.id);
                          }}
                          className="p-1 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>
                        
                        {dropdownOpen === client.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200">
                            <div className="py-1">
                              <button
                                onClick={() => openEditModal(client)}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Client
                              </button>
                              <button
                                onClick={() => openPlatformsModal(client)}
                                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Settings className="w-4 h-4 mr-2" />
                                Manage Platforms
                              </button>
                              <button
                                onClick={() => openDeleteModal(client)}
                                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Client
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
            </table>
          </div>
        </div>

        {clients.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Users className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No clients yet</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by adding your first client.</p>
            <div className="mt-6">
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Client
              </button>
            </div>
          </div>
        ) : filteredAndSortedClients.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Search className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No clients found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Try adjusting your search terms.</p>
            <div className="mt-6">
              <button
                onClick={() => setSearchTerm('')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Clear Search
              </button>
            </div>
          </div>
        ) : null}

        <AddClientModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleAddClient}
        />

        <EditClientModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedClient(null);
          }}
          client={selectedClient}
          onSubmit={handleEditClient}
        />

        <DeleteClientModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setSelectedClient(null);
          }}
          client={selectedClient}
          onConfirm={handleDeleteClient}
        />

        <ManageClientPlatformsModal
          isOpen={platformsModalOpen}
          onClose={handlePlatformsModalClose}
          client={selectedClient}
        />
      </StaggerContainer>
    </Layout>
  );
};

export default ClientsList;