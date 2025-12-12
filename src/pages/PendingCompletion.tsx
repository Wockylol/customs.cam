import React, { useState } from 'react';
import { Loader2, AlertCircle, TrendingUp, CheckCircle, ChevronUp, ChevronDown, Grid, List, Search } from 'lucide-react';
import Layout from '../components/layout/Layout';
import CustomCard from '../components/ui/CustomCard';
import CustomDetailModal from '../components/modals/CustomDetailModal';
import { useCustomRequests } from '../hooks/useCustomRequests';
import { StaggerContainer } from '../components/ui/StaggerContainer';

const PendingCompletion: React.FC = () => {
  const [selectedCustom, setSelectedCustom] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [sortField, setSortField] = useState<'client' | 'date' | 'proposed' | 'paid' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const { customRequests, loading, error, markAsCompleted, fetchCustomRequests } = useCustomRequests();
  
  // Filter for in_progress status
  const inProgressCustoms = customRequests.filter(c => {
    if (c.status !== 'in_progress') return false;
    
    // Filter by client username if search term exists
    if (searchTerm) {
      const clientUsername = (c as any).clients?.username || '';
      return clientUsername.toLowerCase().includes(searchTerm.toLowerCase());
    }
    
    return true;
  });

  const handleSort = (field: 'client' | 'date' | 'proposed' | 'paid') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortedCustoms = (customs: typeof inProgressCustoms) => {
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

  const handleMarkAsCompleted = async (customId: string) => {
    const { error } = await markAsCompleted(customId);
    if (!error) {
      await fetchCustomRequests();
    }
  };

  if (loading) {
    return (
      <Layout title="Pending Completion">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading in-progress requests...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Pending Completion">
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

  return (
    <Layout title="Pending Completion">
      <StaggerContainer className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <TrendingUp className="w-6 h-6 text-gray-400 mr-2" />
            <span className="text-lg text-gray-600">
              {inProgressCustoms.length} of {customRequests.filter(c => c.status === 'in_progress').length} in progress
              {searchTerm && ` (filtered by "${searchTerm}")`}
            </span>
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

        {/* Search Bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by client username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {inProgressCustoms.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            {searchTerm ? (
              <>
                <Search className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No matching requests found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No in-progress requests match "{searchTerm}". Try adjusting your search.
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
                <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">All work completed!</h3>
                <p className="mt-1 text-sm text-gray-500">No custom requests currently in progress.</p>
              </>
            )}
          </div>
        ) : (
          <>
            {viewMode === 'cards' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {getSortedCustoms(inProgressCustoms).map((custom) => (
                  <div key={custom.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <CustomCard 
                      custom={custom} 
                      onClick={() => handleCustomClick(custom)}
                    />
                    {/* Action buttons at bottom */}
                    <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCustomClick(custom);
                        }}
                        className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                      >
                        View
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsCompleted(custom.id);
                        }}
                        className="px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                      >
                        Mark Complete
                      </button>
                    </div>
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
                        <SortButton field="date">Date</SortButton>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estimated Delivery
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Age (Days)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Late (Days)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <SortButton field="proposed">Proposed</SortButton>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <SortButton field="paid">Paid</SortButton>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getSortedCustoms(inProgressCustoms).map((custom) => (
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
                          {custom.estimated_delivery_date ? (
                            new Date(custom.estimated_delivery_date).toLocaleDateString()
                          ) : (
                            <span className="text-gray-400">Not set</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          {(() => {
                            const submissionDate = new Date(custom.date_submitted);
                            const today = new Date();
                            const diffTime = today.getTime() - submissionDate.getTime();
                            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                            return (
                              <span className={diffDays > 7 ? 'text-red-600' : 'text-gray-900'}>
                                {diffDays}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          {(() => {
                            if (!custom.estimated_delivery_date) {
                              return <span className="text-gray-400">-</span>;
                            }
                            const deliveryDate = new Date(custom.estimated_delivery_date);
                            const today = new Date();
                            const diffTime = today.getTime() - deliveryDate.getTime();
                            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                            
                            if (diffDays <= 0) {
                              return <span className="text-green-600">On time</span>;
                            } else {
                              return <span className="text-red-600 font-semibold">{diffDays}</span>;
                            }
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ${(custom.proposed_amount || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          ${(custom.amount_paid || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCustomClick(custom);
                              }}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              View
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsCompleted(custom.id);
                              }}
                              className="text-green-600 hover:text-green-800 font-medium"
                            >
                              Mark Complete
                            </button>
                          </div>
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
      </StaggerContainer>
    </Layout>
  );
};

export default PendingCompletion;