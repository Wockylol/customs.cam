import React, { useState } from 'react';
import { Filter, ChevronUp, ChevronDown, Phone, Calendar, List, ChevronLeft, ChevronRight } from 'lucide-react';
import Layout from '../components/layout/Layout';
import CustomDetailModal from '../components/modals/CustomDetailModal';
import { useCustomRequests } from '../hooks/useCustomRequests';

type ViewMode = 'table' | 'calendar';

const Calls: React.FC = () => {
  const [selectedCustom, setSelectedCustom] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [sortField, setSortField] = useState<'client' | 'date' | 'proposed' | 'paid' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { customRequests, loading, error, fetchCustomRequests } = useCustomRequests();
  const [searchQuery, setSearchQuery] = useState('');

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

  // Filter for only voice/video calls
  const callRequests = customRequests.filter(custom => custom.is_voice_video_call === true);

  const filteredCustoms = callRequests;

  // Search filtered calls
  const searchResults = searchQuery.trim() 
    ? filteredCustoms.filter(custom => {
        const query = searchQuery.toLowerCase();
        const clientUsername = (custom as any).clients?.username?.toLowerCase() || '';
        const fanName = custom.fan_name?.toLowerCase() || '';
        const description = custom.description?.toLowerCase() || '';
        
        return clientUsername.includes(query) || 
               fanName.includes(query) || 
               description.includes(query);
      })
    : [];

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, firstDay, lastDay };
  };

  const getCallsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return filteredCustoms.filter(custom => {
      if (!custom.call_scheduled_at) return false;
      const callDate = new Date(custom.call_scheduled_at).toISOString().split('T')[0];
      return callDate === dateStr;
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const { daysInMonth, startingDayOfWeek, firstDay } = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Get today's and tomorrow's calls
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const todaysCalls = filteredCustoms
    .filter(custom => {
      if (!custom.call_scheduled_at) return false;
      const callDate = new Date(custom.call_scheduled_at).toISOString().split('T')[0];
      return callDate === todayStr;
    })
    .sort((a, b) => {
      if (!a.call_scheduled_at || !b.call_scheduled_at) return 0;
      return new Date(a.call_scheduled_at).getTime() - new Date(b.call_scheduled_at).getTime();
    });

  const tomorrowsCalls = filteredCustoms
    .filter(custom => {
      if (!custom.call_scheduled_at) return false;
      const callDate = new Date(custom.call_scheduled_at).toISOString().split('T')[0];
      return callDate === tomorrowStr;
    })
    .sort((a, b) => {
      if (!a.call_scheduled_at || !b.call_scheduled_at) return 0;
      return new Date(a.call_scheduled_at).getTime() - new Date(b.call_scheduled_at).getTime();
    });

  if (loading) {
    return (
      <Layout title="Calls">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading call requests...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Calls">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-800">Error loading call requests: {error}</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Calls">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Phone className="w-5 h-5 text-blue-600" />
              <span className="text-lg text-gray-600">{filteredCustoms.length} voice/video calls</span>
            </div>
          </div>
          
          {/* View Toggle */}
          <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                viewMode === 'table' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="text-sm font-medium">Table</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                viewMode === 'calendar' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">Calendar</span>
            </button>
          </div>
        </div>

        {/* Today's Calls */}
        {todaysCalls.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
              <div className="flex items-center space-x-2">
                <Phone className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Today's Calls</h3>
                <span className="text-sm text-gray-600">({todaysCalls.length})</span>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {todaysCalls.map((call) => (
                <div
                  key={call.id}
                  onClick={() => handleCustomClick(call)}
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="flex-shrink-0">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          call.status === 'pending' ? 'bg-orange-100' :
                          call.status === 'in_progress' ? 'bg-yellow-100' :
                          call.status === 'completed' ? 'bg-green-100' :
                          'bg-red-100'
                        }`}>
                          <Phone className={`w-6 h-6 ${
                            call.status === 'pending' ? 'text-orange-600' :
                            call.status === 'in_progress' ? 'text-yellow-600' :
                            call.status === 'completed' ? 'text-green-600' :
                            'text-red-600'
                          }`} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <p className="text-sm font-semibold text-gray-900">
                            {call.call_scheduled_at && new Date(call.call_scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <span className="text-gray-400">•</span>
                          <p className="text-sm font-medium text-blue-600">
                            @{(call as any).clients?.username || 'Unknown'}
                          </p>
                          <span className="text-gray-400">•</span>
                          <p className="text-sm text-gray-600">{call.fan_name}</p>
                        </div>
                        <p className="text-sm text-gray-500 mt-1 truncate">{call.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        call.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                        call.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                        call.status === 'completed' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {call.status === 'pending' ? 'Pending' :
                         call.status === 'in_progress' ? 'In Progress' :
                         call.status === 'completed' ? 'Completed' :
                         call.status.charAt(0).toUpperCase() + call.status.slice(1)}
                      </span>
                      <div className="text-right">
                        <p className="text-sm font-medium text-green-600">
                          ${(call.proposed_amount || 0).toFixed(2)}
                        </p>
                        {call.amount_paid && call.amount_paid > 0 && (
                          <p className="text-xs text-gray-500">
                            Paid: ${call.amount_paid.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tomorrow's Calls */}
        {tomorrowsCalls.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-purple-50 border-b border-purple-200">
              <div className="flex items-center space-x-2">
                <Phone className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">Tomorrow's Calls</h3>
                <span className="text-sm text-gray-600">({tomorrowsCalls.length})</span>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {tomorrowsCalls.map((call) => (
                <div
                  key={call.id}
                  onClick={() => handleCustomClick(call)}
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="flex-shrink-0">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          call.status === 'pending' ? 'bg-orange-100' :
                          call.status === 'in_progress' ? 'bg-yellow-100' :
                          call.status === 'completed' ? 'bg-green-100' :
                          'bg-red-100'
                        }`}>
                          <Phone className={`w-6 h-6 ${
                            call.status === 'pending' ? 'text-orange-600' :
                            call.status === 'in_progress' ? 'text-yellow-600' :
                            call.status === 'completed' ? 'text-green-600' :
                            'text-red-600'
                          }`} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <p className="text-sm font-semibold text-gray-900">
                            {call.call_scheduled_at && new Date(call.call_scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <span className="text-gray-400">•</span>
                          <p className="text-sm font-medium text-blue-600">
                            @{(call as any).clients?.username || 'Unknown'}
                          </p>
                          <span className="text-gray-400">•</span>
                          <p className="text-sm text-gray-600">{call.fan_name}</p>
                        </div>
                        <p className="text-sm text-gray-500 mt-1 truncate">{call.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        call.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                        call.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                        call.status === 'completed' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {call.status === 'pending' ? 'Pending' :
                         call.status === 'in_progress' ? 'In Progress' :
                         call.status === 'completed' ? 'Completed' :
                         call.status.charAt(0).toUpperCase() + call.status.slice(1)}
                      </span>
                      <div className="text-right">
                        <p className="text-sm font-medium text-green-600">
                          ${(call.proposed_amount || 0).toFixed(2)}
                        </p>
                        {call.amount_paid && call.amount_paid > 0 && (
                          <p className="text-xs text-gray-500">
                            Paid: ${call.amount_paid.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-11 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Search by client, fan name, or description..."
              />
              <Filter className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>
          </div>

          {/* Search Results */}
          {searchQuery.trim() && (
            <div className="border-t border-gray-200">
              {searchResults.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {searchResults.map((call) => (
                    <div
                      key={call.id}
                      onClick={() => handleCustomClick(call)}
                      className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="flex-shrink-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              call.status === 'pending' ? 'bg-orange-100' :
                              call.status === 'in_progress' ? 'bg-yellow-100' :
                              call.status === 'completed' ? 'bg-green-100' :
                              'bg-red-100'
                            }`}>
                              <Phone className={`w-5 h-5 ${
                                call.status === 'pending' ? 'text-orange-600' :
                                call.status === 'in_progress' ? 'text-yellow-600' :
                                call.status === 'completed' ? 'text-green-600' :
                                'text-red-600'
                              }`} />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3">
                              <p className="text-sm font-medium text-blue-600">
                                @{(call as any).clients?.username || 'Unknown'}
                              </p>
                              <span className="text-gray-400">•</span>
                              <p className="text-sm text-gray-600">{call.fan_name}</p>
                              {call.call_scheduled_at && (
                                <>
                                  <span className="text-gray-400">•</span>
                                  <p className="text-sm font-medium text-gray-900">
                                    {new Date(call.call_scheduled_at).toLocaleDateString()} at {new Date(call.call_scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1 truncate">{call.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            call.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                            call.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                            call.status === 'completed' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {call.status === 'pending' ? 'Pending' :
                             call.status === 'in_progress' ? 'In Progress' :
                             call.status === 'completed' ? 'Completed' :
                             call.status.charAt(0).toUpperCase() + call.status.slice(1)}
                          </span>
                          <div className="text-right">
                            <p className="text-sm font-medium text-green-600">
                              ${(call.proposed_amount || 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-8 text-center">
                  <Phone className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No calls found matching "{searchQuery}"</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Table View */}
        {viewMode === 'table' && (
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
                    Scheduled
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {custom.call_scheduled_at ? (
                        <div>
                          <div className="font-medium">{new Date(custom.call_scheduled_at).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">{new Date(custom.call_scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not scheduled</span>
                      )}
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
                <Phone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <div className="text-gray-500">
                  {callRequests.length === 0 ? 'No call requests found.' : 'No call requests match the current filters.'}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Calendar Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">{monthName}</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                  title="Previous month"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={goToToday}
                  className="px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                  title="Next month"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="p-4">
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-2">
                {/* Empty cells for days before month starts */}
                {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                  <div key={`empty-${index}`} className="aspect-square" />
                ))}

                {/* Days of the month */}
                {Array.from({ length: daysInMonth }).map((_, index) => {
                  const dayNumber = index + 1;
                  const date = new Date(firstDay);
                  date.setDate(dayNumber);
                  const callsOnThisDay = getCallsForDate(date);
                  const isToday = new Date().toDateString() === date.toDateString();

                  return (
                    <div
                      key={dayNumber}
                      className={`aspect-square border border-gray-200 rounded-lg p-2 ${
                        isToday ? 'bg-blue-50 border-blue-300' : 'bg-white'
                      } hover:border-blue-400 transition-colors`}
                    >
                      <div className={`text-sm font-medium mb-1 ${
                        isToday ? 'text-blue-600' : 'text-gray-900'
                      }`}>
                        {dayNumber}
                      </div>
                      
                      {callsOnThisDay.length > 0 && (
                        <div className="space-y-1">
                          {callsOnThisDay.slice(0, 3).map((call) => (
                            <button
                              key={call.id}
                              onClick={() => handleCustomClick(call)}
                              className={`w-full text-left text-xs px-1.5 py-1 rounded truncate ${
                                call.status === 'pending' ? 'bg-orange-100 text-orange-800 hover:bg-orange-200' :
                                call.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' :
                                call.status === 'completed' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                                'bg-red-100 text-red-800 hover:bg-red-200'
                              }`}
                              title={`${(call as any).clients?.username} - ${call.fan_name} - ${call.call_scheduled_at ? new Date(call.call_scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}`}
                            >
                              <Phone className="w-3 h-3 inline mr-1" />
                              {call.call_scheduled_at 
                                ? new Date(call.call_scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : (call as any).clients?.username}
                            </button>
                          ))}
                          {callsOnThisDay.length > 3 && (
                            <div className="text-xs text-gray-500 text-center">
                              +{callsOnThisDay.length - 3} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded bg-orange-100 border border-orange-200"></div>
                  <span className="text-gray-600">Pending</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-200"></div>
                  <span className="text-gray-600">In Progress</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded bg-green-100 border border-green-200"></div>
                  <span className="text-gray-600">Completed</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <CustomDetailModal
          isOpen={isDetailModalOpen}
          onClose={handleCloseDetailModal}
          custom={selectedCustom}
          onUpdate={fetchCustomRequests}
        />
      </div>
    </Layout>
  );
};

export default Calls;

