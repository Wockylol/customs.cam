import React from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, AlertCircle, Grid, List, ChevronUp, ChevronDown, Star, Clock, CheckCircle2, Package, DollarSign, TrendingUp, Calendar, Bell, Eye, ThumbsUp, Filter, Search, Layers } from 'lucide-react';
import Layout from '../components/layout/Layout';
import CustomCard from '../components/ui/CustomCard';
import CustomTableRow from '../components/ui/CustomTableRow';
import PlatformBadge from '../components/ui/PlatformBadge';
import CustomDetailModal from '../components/modals/CustomDetailModal';
import ClientApprovalModal from '../components/modals/ClientApprovalModal';
import { useCustomRequests } from '../hooks/useCustomRequests';
import { useClients } from '../hooks/useClients';
import { useClientPlatforms } from '../hooks/useClientPlatforms';
import { Database } from '../lib/database.types';

type CustomRequest = Database['public']['Tables']['custom_requests']['Row'];
type Client = Database['public']['Tables']['clients']['Row'];

const PublicClientView: React.FC = () => {
  const { clientUsername } = useParams<{ clientUsername: string }>();
  const [viewMode, setViewMode] = React.useState<'cards' | 'table'>('cards');
  const [selectedCustom, setSelectedCustom] = React.useState<CustomRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = React.useState(false);
  const [sortField, setSortField] = React.useState<'date_submitted' | 'proposed_amount' | 'amount_paid' | null>(null);
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [searchTerm, setSearchTerm] = React.useState('');
  const { customRequests, loading: customsLoading, error: customsError, markAsCompleted, approveByClient, fetchCustomRequests } = useCustomRequests();
  // Include inactive clients so resigned clients can still view their data
  const { clients, loading: clientsLoading, error: clientsError } = useClients({ includeInactive: true });
  const { clientPlatforms, loading: platformsLoading } = useClientPlatforms(client?.id);
  
  const client = clients.find((c: Client) => c.username.toLowerCase() === clientUsername?.toLowerCase());
  const allClientCustoms: CustomRequest[] = customRequests.filter((c: CustomRequest) => 
    (c as any).clients?.username?.toLowerCase() === clientUsername?.toLowerCase() &&
    c.status !== 'pending'
  );

  // Filter customs based on search and status
  const filteredCustoms: CustomRequest[] = allClientCustoms.filter((custom: CustomRequest) => {
    const matchesSearch = searchTerm === '' || 
      custom.fan_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      custom.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || (custom.status as unknown as string) === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Separate customs by approval status
  const needingClientApproval: CustomRequest[] = filteredCustoms.filter((c: CustomRequest) => (c.status as unknown as string) === 'pending_client_approval');
  const clientApproved: CustomRequest[] = filteredCustoms.filter((c: CustomRequest) => {
    const status = c.status as unknown as string;
    return status === 'in_progress' || status === 'completed' || status === 'delivered';
  });

  // Calculate payment metrics
  const totalPaidAmount = allClientCustoms.reduce((sum: number, custom: CustomRequest) => {
    return sum + (custom.amount_paid || 0);
  }, 0);

  const totalPendingAmount = allClientCustoms
    .filter((c: CustomRequest) => {
      const status = c.status as unknown as string;
      return status === 'pending_client_approval' || status === 'in_progress' || status === 'completed';
    })
    .reduce((sum: number, custom: CustomRequest) => {
      const proposed = custom.proposed_amount || 0;
      const paid = custom.amount_paid || 0;
      return sum + Math.max(0, proposed - paid);
    }, 0);

  const pendingTotal = allClientCustoms.filter((c: CustomRequest) => {
    const status = c.status as unknown as string;
    return status === 'pending_client_approval' || status === 'in_progress';
  }).length;
  const activeCount = allClientCustoms.filter((c: CustomRequest) => {
    const status = c.status as unknown as string;
    return status === 'pending_client_approval' || status === 'in_progress';
  }).length;

  const loading = customsLoading || clientsLoading || platformsLoading;
  const error = customsError || clientsError;

  const handleMarkComplete = async (customId: string) => {
    const { error } = await markAsCompleted(customId);
    if (error) {
      console.error('Error marking custom as complete:', error);
    } else {
      await fetchCustomRequests();
    }
  };

  const handleApprovalClick = (custom: CustomRequest) => {
    setSelectedCustom(custom);
    setIsApprovalModalOpen(true);
  };

  const handleCloseApprovalModal = () => {
    setIsApprovalModalOpen(false);
    setSelectedCustom(null);
  };

  const handleApproveByClient = async (customId: string, estimatedDeliveryDate: string) => {
    const { error } = await approveByClient(customId, estimatedDeliveryDate);
    if (!error) {
      // Refetch to update the UI immediately
      await fetchCustomRequests();
    }
    return { error };
  };

  const handleDenyByClient = async (customId: string) => {
    handleCloseApprovalModal();
    return { error: null };
  };

  const handleSort = (field: 'date_submitted' | 'proposed_amount' | 'amount_paid') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortedCustoms = (customs: CustomRequest[]) => {
    if (!sortField) {
      return customs.sort((a: CustomRequest, b: CustomRequest) => new Date((b as any).date_submitted).getTime() - new Date((a as any).date_submitted).getTime());
    }

    return [...customs].sort((a: CustomRequest, b: CustomRequest) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'date_submitted':
          aValue = new Date((a as any).date_submitted).getTime();
          bValue = new Date((b as any).date_submitted).getTime();
          break;
        case 'proposed_amount':
          aValue = (a as any).proposed_amount || 0;
          bValue = (b as any).proposed_amount || 0;
        break;
        case 'amount_paid':
          aValue = (a as any).amount_paid || 0;
          bValue = (b as any).amount_paid || 0;
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
  };

  const SortButton: React.FC<{ field: 'date_submitted' | 'proposed_amount' | 'amount_paid'; children: React.ReactNode }> = ({ field, children }: { field: 'date_submitted' | 'proposed_amount' | 'amount_paid'; children: React.ReactNode }) => {
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

  const handleCustomClick = (custom: CustomRequest) => {
    setSelectedCustom(custom);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCustom(null);
  };

  if (loading) {
    return (
      <Layout title="Loading...">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Error">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">Error loading data: {error}</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!client) {
    return (
      <Layout title="Client Not Found">
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-900">Client not found</h2>
          <p className="mt-2 text-gray-600">The requested client dashboard could not be found.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`@${client.username}'s Custom Dashboard`}>
      <div className="space-y-6 lg:space-y-8">
        {/* Enhanced Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 opacity-90"></div>
          <div className="absolute inset-0 bg-black opacity-20"></div>
          <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-6 lg:p-8 text-white shadow-2xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="mb-4 lg:mb-0">
                <div className="flex items-center mb-3">
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4 backdrop-blur-sm">
                    <Star className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold">Welcome back, @{client.username}</h1>
                    <p className="text-blue-100 text-sm lg:text-base">Your custom content dashboard</p>
                  </div>
                </div>
                <p className="text-blue-100 max-w-2xl">
                  Track your custom requests, approve new content, and manage your personalized experience.
                </p>
              </div>
              
              {/* Quick Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                {needingClientApproval.length > 0 && (
                  <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg px-4 py-3 flex items-center">
                    <Bell className="w-5 h-5 text-yellow-300 mr-2" />
                    <div className="text-sm">
                      <div className="font-semibold">{needingClientApproval.length} Pending</div>
                      <div className="text-blue-100">Needs your approval</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl lg:text-3xl font-bold text-gray-900">{allClientCustoms.length}</div>
                <div className="text-sm text-gray-600 mt-1">Total Requests</div>
              </div>
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl lg:text-3xl font-bold text-orange-600">{activeCount}</div>
                <div className="text-sm text-gray-600 mt-1">Active</div>
              </div>
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 lg:w-6 lg:h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl lg:text-3xl font-bold text-orange-600">${totalPendingAmount.toFixed(0)}</div>
                <div className="text-sm text-gray-600 mt-1">Pending Total</div>
              </div>
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 lg:w-6 lg:h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xl lg:text-2xl font-bold text-green-600">${totalPaidAmount.toFixed(0)}</div>
                <div className="text-sm text-gray-600 mt-1">Total Earned</div>
                {totalPendingAmount > 0 && (
                  <div className="text-xs text-orange-600 mt-1">+${totalPendingAmount.toFixed(0)} pending</div>
                )}
              </div>
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Platforms Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <Layers className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600" />
                </div>
                <div>
                  <div className="text-lg lg:text-xl font-bold text-gray-900">{clientPlatforms.length}</div>
                  <div className="text-sm text-gray-600">Platforms</div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {clientPlatforms.slice(0, 2).map((cp) => (
                <PlatformBadge 
                  key={cp.id}
                  platform={cp.platform!} 
                  size="sm" 
                />
              ))}
              {clientPlatforms.length > 2 && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  +{clientPlatforms.length - 2}
                </span>
              )}
              {clientPlatforms.length === 0 && (
                <span className="text-xs text-gray-400">No platforms</span>
              )}
            </div>
          </div>
        </div>

        {/* Pending Client Approval Section - Enhanced */}
        {needingClientApproval.length > 0 && (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-6 lg:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mr-4">
                  <Bell className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-xl lg:text-2xl font-bold text-orange-900">
                    Pending Your Approval
                  </h2>
                  <p className="text-orange-700 text-sm mt-1">
                    {needingClientApproval.length} request{needingClientApproval.length !== 1 ? 's' : ''} waiting for your review
                  </p>
                </div>
              </div>
              <div className="bg-orange-200 text-orange-800 px-3 py-1 rounded-full text-sm font-semibold">
                {needingClientApproval.length}
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              {getSortedCustoms(needingClientApproval).map((custom: CustomRequest) => (
                <div key={custom.id} className="bg-white rounded-xl border border-orange-200 p-4 lg:p-6 shadow-sm hover:shadow-md transition-all duration-200">
                  <CustomCard 
                    custom={custom} 
                    onClick={() => handleCustomClick(custom)}
                  />
                  <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCustomClick(custom);
                      }}
                      className="flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApprovalClick(custom);
                      }}
                      className="flex items-center justify-center px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
                    >
                      <ThumbsUp className="w-4 h-4 mr-2" />
                      Review & Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approved Custom Requests Section - Enhanced */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="p-6 lg:p-8 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-xl lg:text-2xl font-bold text-gray-900">
                  Your Custom Requests
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  {clientApproved.length} approved request{clientApproved.length !== 1 ? 's' : ''}
                </p>
              </div>
              
              {clientApproved.length > 0 && (
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search requests..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-48"
                    />
                  </div>

                  {/* Status Filter */}
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                    >
                      <option value="all">All Status</option>
                      <option value="pending_client_approval">Pending Approval</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="delivered">Delivered</option>
                    </select>
                  </div>

                  {/* View Toggle */}
                  <div className="flex items-center bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('cards')}
                      className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        viewMode === 'cards'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Grid className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Cards</span>
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        viewMode === 'table'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <List className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Table</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="p-6 lg:p-8">
            {clientApproved.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No approved requests yet</h3>
                <p className="text-gray-600">Your approved custom requests will appear here once you start approving them.</p>
              </div>
            ) : filteredCustoms.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No matching requests</h3>
                <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                  }}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                {viewMode === 'cards' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                    {getSortedCustoms(clientApproved).map((custom: CustomRequest) => (
                      <div key={custom.id} className="group">
                        <CustomCard 
                          custom={custom} 
                          onClick={() => handleCustomClick(custom)}
                          onMarkComplete={handleMarkComplete}
                          showMarkComplete={custom.status === 'in_progress'}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fan Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <SortButton field="date_submitted">Date</SortButton>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <SortButton field="proposed_amount">Proposed</SortButton>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <SortButton field="amount_paid">Paid</SortButton>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Length
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Chat
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {getSortedCustoms(clientApproved).map((custom: CustomRequest) => (
                          <CustomTableRow 
                            key={custom.id} 
                            custom={custom} 
                            showClientColumn={false}
                            onClick={() => handleCustomClick(custom)}
                            onMarkComplete={handleMarkComplete}
                            showMarkComplete={custom.status === 'in_progress'}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <CustomDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        custom={selectedCustom}
        onMarkComplete={handleMarkComplete}
        showMarkComplete={true}
        onUpdate={fetchCustomRequests}
      />

      <ClientApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={handleCloseApprovalModal}
        custom={selectedCustom}
        onApprove={handleApproveByClient}
        onDeny={handleDenyByClient}
      />
    </Layout>
  );
};

export default PublicClientView;