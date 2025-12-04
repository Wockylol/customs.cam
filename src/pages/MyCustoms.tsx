import React, { useState } from 'react';
import { User, Filter, ChevronUp, ChevronDown, Grid2x2 as Grid, List, Search, FileText, Calendar, DollarSign, Clock, CheckCircle, Package, Plus } from 'lucide-react';
import Layout from '../components/layout/Layout';
import CustomCard from '../components/ui/CustomCard';
import CustomDetailModal from '../components/modals/CustomDetailModal';
import AddCustomModal from '../components/modals/AddCustomModal';
import { useCustomRequests } from '../hooks/useCustomRequests';
import { useAuth } from '../contexts/AuthContext';

const MyCustoms: React.FC = () => {
  const [selectedCustom, setSelectedCustom] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [sortField, setSortField] = useState<'client' | 'date' | 'proposed' | 'paid' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { customRequests, loading, error, addCustomRequest, fetchCustomRequests } = useCustomRequests();
  const { user } = useAuth();

  // Filter customs created by the current user
  const myCustoms = customRequests.filter(c => c.created_by === user?.id);

  // Apply additional filters
  const filteredCustoms = myCustoms.filter(custom => {
    const matchesSearch = searchTerm === '' || 
      custom.fan_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      custom.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (custom as any).clients?.username?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || custom.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate metrics
  const totalSubmitted = myCustoms.length;
  const pendingApproval = myCustoms.filter(c => c.status === 'pending').length;
  const approved = myCustoms.filter(c => 
    c.status === 'pending_client_approval' || 
    c.status === 'in_progress' || 
    c.status === 'completed' || 
    c.status === 'delivered'
  ).length;
  const delivered = myCustoms.filter(c => c.status === 'delivered').length;

  const totalValue = myCustoms.reduce((sum, custom) => sum + (custom.proposed_amount || 0), 0);

  const handleSort = (field: 'client' | 'date' | 'proposed' | 'paid') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortedCustoms = (customs: typeof filteredCustoms) => {
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
        case 'proposed':
          aValue = a.proposed_amount || 0;
          bValue = b.proposed_amount || 0;
          break;
        case 'paid':
          aValue = a.amount_paid || 0;
          bValue = b.amount_paid || 0;
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

  const SortButton: React.FC<{ field: 'client' | 'date' | 'proposed' | 'paid'; children: React.ReactNode }> = ({ field, children }) => {
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

  const handleCustomClick = (custom: any) => {
    setSelectedCustom(custom);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedCustom(null);
  };

  const handleAddCustom = async (customData: {
    clientUsername: string;
    fanName: string;
    description: string;
    fanLifetimeSpend?: number;
    proposedAmount: number;
    amountPaid?: number;
    length: string;
    chatLink?: string;
    notes?: string;
    images?: File[];
  }) => {
    const { error } = await addCustomRequest(customData);
    if (!error) {
      setIsAddModalOpen(false);
    }
    return { error };
  };

  if (loading) {
    return (
      <Layout title="My Customs">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your custom requests...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="My Customs">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">Error loading custom requests: {error}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="My Customs">
      <div className="space-y-6">
        {/* Header with Stats */}
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-6 lg:p-8 text-white shadow-2xl">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4 backdrop-blur-sm">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">My Custom Requests</h1>
              <p className="text-blue-100 text-sm lg:text-base">Customs you've submitted for clients</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">{totalSubmitted}</div>
              <div className="text-blue-100 text-sm">Total Submitted</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">{pendingApproval}</div>
              <div className="text-blue-100 text-sm">Pending Approval</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">{approved}</div>
              <div className="text-blue-100 text-sm">Approved</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">${totalValue.toFixed(0)}</div>
              <div className="text-blue-100 text-sm">Total Value</div>
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Your Submissions</h2>
              <p className="text-gray-600 text-sm mt-1">
                {filteredCustoms.length} of {myCustoms.length} customs
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Add Custom Button */}
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Custom
              </button>
              
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

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending Team Approval</option>
                <option value="pending_client_approval">Pending Client Approval</option>
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
                  Cards
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
                  Table
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Customs Display */}
        {filteredCustoms.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            {myCustoms.length === 0 ? (
              <>
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No customs submitted yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  You haven't submitted any custom requests yet. Start by adding customs for your clients!
                </p>
              </>
            ) : (
              <>
                <Search className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No matching customs found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No customs match your current filters. Try adjusting your search or filters.
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                  }}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Clear Filters
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {viewMode === 'cards' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                {getSortedCustoms(filteredCustoms).map((custom) => (
                  <div key={custom.id} className="group">
                    <CustomCard 
                      custom={custom} 
                      onClick={() => handleCustomClick(custom)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                        <SortButton field="date">Date Submitted</SortButton>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <SortButton field="proposed">Proposed</SortButton>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <SortButton field="paid">Paid</SortButton>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Chat
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getSortedCustoms(filteredCustoms).map((custom) => (
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
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            {new Date(custom.date_submitted).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          <div className="flex items-center">
                            <DollarSign className="w-4 h-4 mr-1" />
                            {(custom.proposed_amount || 0).toFixed(2)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          <div className="flex items-center">
                            <DollarSign className="w-4 h-4 mr-1" />
                            {(custom.amount_paid || 0).toFixed(2)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            custom.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                            custom.status === 'pending_client_approval' ? 'bg-blue-100 text-blue-800' :
                            custom.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                            custom.status === 'completed' ? 'bg-purple-100 text-purple-800' :
                            custom.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {custom.status === 'pending' ? 'Pending Team' :
                             custom.status === 'pending_client_approval' ? 'Pending Client' :
                             custom.status === 'in_progress' ? 'In Progress' :
                             custom.status === 'completed' ? 'Completed' :
                             custom.status === 'delivered' ? 'Delivered' :
                             custom.status.charAt(0).toUpperCase() + custom.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {custom.chat_link ? (
                            <a 
                              href={custom.chat_link} 
                              className="text-blue-600 hover:text-blue-800"
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Chat
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        <CustomDetailModal
          isOpen={isDetailModalOpen}
          onClose={handleCloseDetailModal}
          custom={selectedCustom}
          onUpdate={fetchCustomRequests}
        />

        <AddCustomModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleAddCustom}
        />
      </div>
    </Layout>
  );
};

export default MyCustoms;