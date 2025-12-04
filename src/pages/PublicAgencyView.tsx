import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, AlertCircle, Building2, Users, DollarSign, TrendingUp, Calendar, Star, Filter, Search, Grid, List, ChevronUp, ChevronDown, Clock, CheckCircle, Package } from 'lucide-react';
import AgencyLayout from '../components/layout/AgencyLayout';
import CustomCard from '../components/ui/CustomCard';
import CustomDetailModal from '../components/modals/CustomDetailModal';
import { useAgencies } from '../hooks/useAgencies';
import { useClients } from '../hooks/useClients';
import { useCustomRequests } from '../hooks/useCustomRequests';
import { Database } from '../lib/database.types';

type Agency = Database['public']['Tables']['agencies']['Row'];
type Client = Database['public']['Tables']['clients']['Row'];
type CustomRequest = Database['public']['Tables']['custom_requests']['Row'];

const PublicAgencyView: React.FC = () => {
  const { agencySlug } = useParams<{ agencySlug: string }>();
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedCustom, setSelectedCustom] = useState<CustomRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortField, setSortField] = useState<'client' | 'date' | 'amount' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const { agencies, loading: agenciesLoading, error: agenciesError } = useAgencies();
  const { clients, loading: clientsLoading, error: clientsError } = useClients();
  const { customRequests, loading: customsLoading, error: customsError, fetchCustomRequests } = useCustomRequests();

  const agency = agencies.find((a: Agency) => a.slug === agencySlug);
  const agencyClients = clients.filter((c: Client) => c.agency_id === agency?.id);
  const agencyClientIds = agencyClients.map(c => c.id);
  
  // Filter customs by time period
  const getFilteredCustomsByTime = (customs: CustomRequest[]) => {
    if (timeFilter === 'all') return customs;
    
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (timeFilter) {
      case '7d':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        cutoffDate.setDate(now.getDate() - 90);
        break;
    }
    
    return customs.filter(c => new Date(c.date_submitted) >= cutoffDate);
  };

  const allAgencyCustoms = customRequests.filter((c: CustomRequest) => 
    agencyClientIds.includes(c.client_id)
  );

  const timeFilteredCustoms = getFilteredCustomsByTime(allAgencyCustoms);

  // Apply additional filters
  const filteredCustoms = timeFilteredCustoms.filter((custom: CustomRequest) => {
    const matchesSearch = searchTerm === '' || 
      custom.fan_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      custom.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (custom as any).clients?.username?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || custom.status === statusFilter;
    const matchesClient = clientFilter === 'all' || custom.client_id === clientFilter;
    
    return matchesSearch && matchesStatus && matchesClient;
  });

  const loading = agenciesLoading || clientsLoading || customsLoading;
  const error = agenciesError || clientsError || customsError;

  // Calculate metrics
  const totalRevenue = timeFilteredCustoms.reduce((sum, custom) => sum + (custom.amount_paid || 0), 0);
  const pendingRevenue = timeFilteredCustoms
    .filter(c => c.status !== 'delivered' && c.status !== 'cancelled')
    .reduce((sum, custom) => {
      const proposed = custom.proposed_amount || 0;
      const paid = custom.amount_paid || 0;
      return sum + Math.max(0, proposed - paid);
    }, 0);
  
  const activeCustoms = timeFilteredCustoms.filter(c => 
    c.status === 'pending_client_approval' || c.status === 'in_progress' || c.status === 'completed'
  ).length;

  // Client performance metrics
  const clientMetrics = agencyClients.map(client => {
    const clientCustoms = timeFilteredCustoms.filter(c => c.client_id === client.id);
    const revenue = clientCustoms.reduce((sum, c) => sum + (c.amount_paid || 0), 0);
    const pending = clientCustoms.filter(c => 
      c.status === 'pending_client_approval' || c.status === 'in_progress'
    ).length;
    const completed = clientCustoms.filter(c => c.status === 'delivered').length;
    
    return {
      client,
      customsCount: clientCustoms.length,
      revenue,
      pending,
      completed,
      avgOrderValue: clientCustoms.length > 0 ? revenue / clientCustoms.length : 0
    };
  }).sort((a, b) => b.revenue - a.revenue);

  // Top performing clients
  const topClients = clientMetrics.slice(0, 5);

  const handleSort = (field: 'client' | 'date' | 'amount') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortedCustoms = (customs: CustomRequest[]) => {
    if (!sortField) {
      return customs.sort((a, b) => new Date(b.date_submitted).getTime() - new Date(a.date_submitted).getTime());
    }

    return [...customs].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'client':
          aValue = (a as any).clients?.username || '';
          bValue = (b as any).clients?.username || '';
          break;
        case 'date':
          aValue = new Date(a.date_submitted).getTime();
          bValue = new Date(b.date_submitted).getTime();
          break;
        case 'amount':
          aValue = a.proposed_amount || 0;
          bValue = b.proposed_amount || 0;
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
  };

  const SortButton: React.FC<{ field: 'client' | 'date' | 'amount'; children: React.ReactNode }> = ({ field, children }) => {
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
      <AgencyLayout title="Loading...">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading agency dashboard...</p>
          </div>
        </div>
      </AgencyLayout>
    );
  }

  if (error) {
    return (
      <AgencyLayout title="Error">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">Error loading data: {error}</p>
            </div>
          </div>
        </div>
      </AgencyLayout>
    );
  }

  if (!agency) {
    return (
      <AgencyLayout title="Agency Not Found">
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-900">Agency not found</h2>
          <p className="mt-2 text-gray-600">The requested agency dashboard could not be found.</p>
        </div>
      </AgencyLayout>
    );
  }

  return (
    <AgencyLayout title={`${agency.name} - Agency Dashboard`}>
      <div className="space-y-6 lg:space-y-8">
        {/* Enhanced Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 opacity-90"></div>
          <div className="absolute inset-0 bg-black opacity-20"></div>
          <div className="relative bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl p-6 lg:p-8 text-white shadow-2xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="mb-4 lg:mb-0">
                <div className="flex items-center mb-3">
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4 backdrop-blur-sm">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold">{agency.name}</h1>
                    <p className="text-blue-100 text-sm lg:text-base">Agency Performance Dashboard</p>
                  </div>
                </div>
                {agency.description && (
                  <p className="text-blue-100 max-w-2xl">
                    {agency.description}
                  </p>
                )}
              </div>
              
              {/* Time Filter */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg px-4 py-3">
                  <select
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value as any)}
                    className="bg-transparent text-white text-sm font-medium focus:outline-none"
                  >
                    <option value="7d" className="text-gray-900">Last 7 days</option>
                    <option value="30d" className="text-gray-900">Last 30 days</option>
                    <option value="90d" className="text-gray-900">Last 90 days</option>
                    <option value="all" className="text-gray-900">All time</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl lg:text-3xl font-bold text-gray-900">{agencyClients.length}</div>
                <div className="text-sm text-gray-600 mt-1">Total Clients</div>
              </div>
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl lg:text-3xl font-bold text-green-600">${totalRevenue.toFixed(0)}</div>
                <div className="text-sm text-gray-600 mt-1">Revenue</div>
              </div>
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 lg:w-6 lg:h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl lg:text-3xl font-bold text-orange-600">{activeCustoms}</div>
                <div className="text-sm text-gray-600 mt-1">Active Customs</div>
              </div>
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 lg:w-6 lg:h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl lg:text-3xl font-bold text-purple-600">${pendingRevenue.toFixed(0)}</div>
                <div className="text-sm text-gray-600 mt-1">Pending Revenue</div>
              </div>
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Top Performing Clients */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="p-6 lg:p-8 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-4">
                  <Star className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h2 className="text-xl lg:text-2xl font-bold text-gray-900">Top Performing Clients</h2>
                  <p className="text-gray-600 text-sm mt-1">Based on revenue in selected time period</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6 lg:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topClients.map((clientMetric, index) => (
                <div key={clientMetric.client.id} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">@{clientMetric.client.username}</div>
                        <div className="text-xs text-gray-500">{clientMetric.customsCount} customs</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">${clientMetric.revenue.toFixed(0)}</div>
                      <div className="text-xs text-gray-500">revenue</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white rounded px-2 py-1">
                      <span className="text-orange-600 font-medium">{clientMetric.pending}</span>
                      <span className="text-gray-500 ml-1">active</span>
                    </div>
                    <div className="bg-white rounded px-2 py-1">
                      <span className="text-green-600 font-medium">{clientMetric.completed}</span>
                      <span className="text-gray-500 ml-1">done</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Custom Requests Section */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="p-6 lg:p-8 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-xl lg:text-2xl font-bold text-gray-900">
                  Custom Requests
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  {filteredCustoms.length} of {timeFilteredCustoms.length} customs
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search customs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-48"
                  />
                </div>

                {/* Client Filter */}
                <select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Clients</option>
                  {agencyClients.map((client) => (
                    <option key={client.id} value={client.id}>
                      @{client.username}
                    </option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="pending_client_approval">Pending Approval</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="delivered">Delivered</option>
                </select>

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
            </div>
          </div>
          
          <div className="p-6 lg:p-8">
            {filteredCustoms.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No customs found</h3>
                <p className="text-gray-600">
                  {timeFilteredCustoms.length === 0 
                    ? 'No custom requests in the selected time period.' 
                    : 'No customs match the current filters.'}
                </p>
                {timeFilteredCustoms.length > 0 && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setClientFilter('all');
                    }}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <>
                {viewMode === 'cards' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                    {getSortedCustoms(filteredCustoms).map((custom: CustomRequest) => (
                      <div key={custom.id} className="group">
                        <CustomCard 
                          custom={custom} 
                          onClick={() => handleCustomClick(custom)}
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
                            <SortButton field="client">Client</SortButton>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fan Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <SortButton field="date">Date</SortButton>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <SortButton field="amount">Amount</SortButton>
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {getSortedCustoms(filteredCustoms).map((custom: CustomRequest) => (
                          <tr key={custom.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleCustomClick(custom)}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {(custom as any).clients?.username ? (
                                <span className="text-blue-600 font-medium">
                                  @{(custom as any).clients.username}
                                </span>
                              ) : (
                                <span className="text-gray-500">Unknown Client</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {custom.fan_name}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <div className="max-w-xs truncate">
                                {custom.description}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(custom.date_submitted).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                              ${(custom.proposed_amount || 0).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                custom.status === 'pending_client_approval' ? 'bg-blue-100 text-blue-800' :
                                custom.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                custom.status === 'completed' ? 'bg-purple-100 text-purple-800' :
                                custom.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {custom.status === 'pending_client_approval' ? 'Pending Client' :
                                 custom.status === 'in_progress' ? 'In Progress' :
                                 custom.status === 'completed' ? 'Completed' :
                                 custom.status === 'delivered' ? 'Delivered' :
                                 custom.status.charAt(0).toUpperCase() + custom.status.slice(1)}
                              </span>
                            </td>
                          </tr>
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
        onUpdate={fetchCustomRequests}
      />
    </AgencyLayout>
  );
};

export default PublicAgencyView;