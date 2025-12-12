import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, AlertCircle, Users, Search, ExternalLink, DollarSign, Package, CheckCircle, Clock, Grid, List } from 'lucide-react';
import AgencyLayout from '../components/layout/AgencyLayout';
import ClientAvatar from '../components/ui/ClientAvatar';
import { useAgencies } from '../hooks/useAgencies';
import { useClients } from '../hooks/useClients';
import { useCustomRequests } from '../hooks/useCustomRequests';
import { Database } from '../lib/database.types';
import { StaggerContainer } from '../components/ui/StaggerContainer';

type Agency = Database['public']['Tables']['agencies']['Row'];
type Client = Database['public']['Tables']['clients']['Row'];
type CustomRequest = Database['public']['Tables']['custom_requests']['Row'];

const AgencyClientsList: React.FC = () => {
  const { agencySlug } = useParams<{ agencySlug: string }>();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  
  const { agencies, loading: agenciesLoading, error: agenciesError } = useAgencies();
  const { clients, loading: clientsLoading, error: clientsError } = useClients();
  const { customRequests, loading: customsLoading, error: customsError } = useCustomRequests();

  const agency = agencies.find((a: Agency) => a.slug === agencySlug);
  const agencyClients = clients.filter((c: Client) => c.agency_id === agency?.id);
  
  const loading = agenciesLoading || clientsLoading || customsLoading;
  const error = agenciesError || clientsError || customsError;

  // Get client metrics
  const getClientMetrics = (clientId: string) => {
    const clientCustoms = customRequests.filter((c: CustomRequest) => c.client_id === clientId);
    const revenue = clientCustoms.reduce((sum, c) => sum + (c.amount_paid || 0), 0);
    const active = clientCustoms.filter(c => 
      c.status === 'pending_client_approval' || c.status === 'in_progress'
    ).length;
    const completed = clientCustoms.filter(c => c.status === 'delivered').length;
    const avgOrderValue = clientCustoms.length > 0 ? revenue / clientCustoms.length : 0;
    
    return {
      totalCustoms: clientCustoms.length,
      revenue,
      active,
      completed,
      avgOrderValue
    };
  };

  // Filter clients based on search
  const filteredClients = agencyClients.filter(client =>
    client.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.phone && client.phone.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <AgencyLayout title="Clients">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading clients...</p>
          </div>
        </div>
      </AgencyLayout>
    );
  }

  if (error) {
    return (
      <AgencyLayout title="Clients">
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
          <p className="mt-2 text-gray-600">The requested agency could not be found.</p>
        </div>
      </AgencyLayout>
    );
  }

  return (
    <AgencyLayout title={`${agency.name} - Clients`}>
      <StaggerContainer className="space-y-6 lg:space-y-8">
        {/* Header Section */}
        <div className="bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl p-6 lg:p-8 text-white shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center mb-3">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4 backdrop-blur-sm">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold">Client Portfolio</h1>
                  <p className="text-purple-100 text-sm lg:text-base">{agency.name}</p>
                </div>
              </div>
              <p className="text-purple-100 max-w-2xl">
                Manage and monitor all clients under your agency
              </p>
            </div>
            
            <div className="mt-4 lg:mt-0">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg px-4 py-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{agencyClients.length}</div>
                    <div className="text-purple-100 text-sm">Total Clients</div>
                  </div>
                </div>
                
                {/* View Toggle */}
                <div className="flex items-center bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'cards'
                        ? 'bg-white bg-opacity-30 text-white shadow-sm'
                        : 'text-purple-100 hover:text-white'
                    }`}
                  >
                    <Grid className="w-4 h-4 mr-2" />
                    Cards
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'table'
                        ? 'bg-white bg-opacity-30 text-white shadow-sm'
                        : 'text-purple-100 hover:text-white'
                    }`}
                  >
                    <List className="w-4 h-4 mr-2" />
                    Table
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search clients by username or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>

        {/* Clients Grid */}
        {filteredClients.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            {searchTerm ? (
              <>
                <Search className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No clients found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No clients match "{searchTerm}". Try adjusting your search.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => setSearchTerm('')}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Clear Search
                  </button>
                </div>
              </>
            ) : (
              <>
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No clients assigned</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No clients are currently assigned to this agency.
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            {viewMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClients.map((client) => {
                  const metrics = getClientMetrics(client.id);
                  
                  return (
                    <div key={client.id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                      {/* Client Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                         <ClientAvatar client={client} size="lg" className="mr-3" />
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              @{client.username}
                            </h3>
                            {client.phone && (
                              <p className="text-sm text-gray-500">{client.phone}</p>
                            )}
                          </div>
                        </div>
                        <a
                          href={`/${client.username}`}
                          className="text-purple-600 hover:text-purple-800 p-2 rounded-lg hover:bg-purple-50 transition-colors"
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View client dashboard"
                        >
                          <ExternalLink className="w-5 h-5" />
                        </a>
                      </div>

                      {/* Metrics Grid */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-center mb-1">
                            <Package className="w-4 h-4 text-gray-600 mr-1" />
                          </div>
                          <div className="text-xl font-bold text-gray-900">{metrics.totalCustoms}</div>
                          <div className="text-xs text-gray-500">Total Customs</div>
                        </div>
                        
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center justify-center mb-1">
                            <DollarSign className="w-4 h-4 text-green-600 mr-1" />
                          </div>
                          <div className="text-xl font-bold text-green-600">${metrics.revenue.toFixed(0)}</div>
                          <div className="text-xs text-gray-500">Revenue</div>
                        </div>
                        
                        <div className="text-center p-3 bg-orange-50 rounded-lg">
                          <div className="flex items-center justify-center mb-1">
                            <Clock className="w-4 h-4 text-orange-600 mr-1" />
                          </div>
                          <div className="text-xl font-bold text-orange-600">{metrics.active}</div>
                          <div className="text-xs text-gray-500">Active</div>
                        </div>
                        
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <div className="flex items-center justify-center mb-1">
                            <CheckCircle className="w-4 h-4 text-purple-600 mr-1" />
                          </div>
                          <div className="text-xl font-bold text-purple-600">{metrics.completed}</div>
                          <div className="text-xs text-gray-500">Delivered</div>
                        </div>
                      </div>

                      {/* Average Order Value */}
                      {metrics.avgOrderValue > 0 && (
                        <div className="pt-3 border-t border-gray-200">
                          <div className="text-center">
                            <div className="text-sm text-gray-600">Avg Order Value</div>
                            <div className="text-lg font-semibold text-gray-900">
                              ${metrics.avgOrderValue.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Customs
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Revenue
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Active
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Delivered
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg Order Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredClients.map((client) => {
                      const metrics = getClientMetrics(client.id);
                      
                      return (
                        <tr key={client.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                             <ClientAvatar client={client} size="md" className="mr-3" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">@{client.username}</div>
                                <div className="text-xs text-gray-500">
                                  Joined {new Date(client.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {client.phone || 'No phone'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Package className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="text-sm font-medium text-gray-900">{metrics.totalCustoms}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <DollarSign className="w-4 h-4 text-green-500 mr-1" />
                              <span className="text-sm font-bold text-green-600">${metrics.revenue.toFixed(0)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 text-orange-500 mr-1" />
                              <span className="text-sm font-medium text-orange-600">{metrics.active}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <CheckCircle className="w-4 h-4 text-purple-500 mr-1" />
                              <span className="text-sm font-medium text-purple-600">{metrics.completed}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {metrics.avgOrderValue > 0 ? `$${metrics.avgOrderValue.toFixed(2)}` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <a
                              href={`/${client.username}`}
                              className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              View Dashboard
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </StaggerContainer>
    </AgencyLayout>
  );
};

export default AgencyClientsList;