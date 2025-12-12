import React, { useState } from 'react';
import { Plus, Filter, ChevronUp, ChevronDown } from 'lucide-react';
import Layout from '../components/layout/Layout';
import CustomTableRow from '../components/ui/CustomTableRow';
import AddCustomModal from '../components/modals/AddCustomModal';
import CustomDetailModal from '../components/modals/CustomDetailModal';
import { useCustomRequests } from '../hooks/useCustomRequests';
import { StaggerContainer } from '../components/ui/StaggerContainer';

const AllCustoms: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustom, setSelectedCustom] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [sortField, setSortField] = useState<'client' | 'date' | 'proposed' | 'paid' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const { customRequests, loading, error, addCustomRequest, fetchCustomRequests } = useCustomRequests();
  const [filters, setFilters] = useState({
    client: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  });

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
    return { error };
  };

  const handleCustomClick = (custom: any) => {
    setSelectedCustom(custom);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedCustom(null);
  };

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

  const filteredCustoms = customRequests.filter(custom => {
    if (filters.client && !custom.clients?.username?.toLowerCase().includes(filters.client.toLowerCase())) {
      return false;
    }
    if (filters.status && custom.status !== filters.status) {
      return false;
    }
    if (filters.dateFrom && custom.date_submitted < filters.dateFrom) {
      return false;
    }
    if (filters.dateTo && custom.date_submitted > filters.dateTo) {
      return false;
    }
    return true;
  });

  if (loading) {
    return (
      <Layout title="All Customs">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading custom requests...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="All Customs">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-800">Error loading custom requests: {error}</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="All Customs">
      <StaggerContainer className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <span className="text-lg text-gray-600">{filteredCustoms.length} customs</span>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Custom
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <Filter className="w-5 h-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="clientFilter" className="block text-sm font-medium text-gray-700 mb-1">
                Client
              </label>
              <input
                type="text"
                id="clientFilter"
                value={filters.client}
                onChange={(e) => setFilters({ ...filters, client: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Search clients..."
              />
            </div>

            <div>
              <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="statusFilter"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <input
                type="date"
                id="dateFrom"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <input
                type="date"
                id="dateTo"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Customs Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <SortButton field="client">Client</SortButton>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <SortButton field="date">Date</SortButton>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fan Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lifetime Spend
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <SortButton field="proposed">Proposed</SortButton>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <SortButton field="paid">Paid</SortButton>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chat
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(custom.date_submitted).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {custom.fan_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600">
                    {custom.fan_lifetime_spend ? `$${custom.fan_lifetime_spend.toFixed(2)}` : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs truncate">
                      {custom.description}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                    ${(custom.proposed_amount || 0).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                    ${(custom.amount_paid || 0).toFixed(2)}
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      custom.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                      custom.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                      custom.status === 'completed' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {custom.status === 'pending' ? 'Pending' :
                       custom.status === 'in_progress' ? 'In Progress' :
                       custom.status === 'completed' ? 'Completed' :
                       custom.status.charAt(0).toUpperCase() + custom.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredCustoms.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500">
                {customRequests.length === 0 ? 'No customs found.' : 'No customs match the current filters.'}
              </div>
            </div>
          )}
        </div>

        <AddCustomModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleAddCustom}
        />

        <CustomDetailModal
          isOpen={isDetailModalOpen}
          onClose={handleCloseDetailModal}
          custom={selectedCustom}
          onUpdate={fetchCustomRequests}
        />
      </StaggerContainer>
    </Layout>
  );
};

export default AllCustoms;