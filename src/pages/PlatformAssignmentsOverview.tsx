import React, { useState, useMemo } from 'react';
import { Users, Search, Filter, Grid, List, Clock, User, Layers, Download, RefreshCw, AlertCircle, Eye, Settings, UserCog } from 'lucide-react';
import Layout from '../components/layout/Layout';
import ClientAvatar from '../components/ui/ClientAvatar';
import PlatformBadge from '../components/ui/PlatformBadge';
import { useChatterAssignments } from '../hooks/useChatterAssignments';
import { useTeamMembers } from '../hooks/useTeamMembers';
import { useClients } from '../hooks/useClients';
import { useClientPlatforms } from '../hooks/useClientPlatforms';
import { usePlatforms } from '../hooks/usePlatforms';
import { supabase } from '../lib/supabase';

interface PlatformAssignmentData {
  clientPlatformId: string;
  clientId: string;
  clientUsername: string;
  clientAvatarUrl: string | null;
  platformId: string;
  platformName: string;
  platformIcon: string | null;
  platformColor: string;
  accountName: string | null;
  usernameOnPlatform: string | null;
  profileUrl: string | null;
  dayShiftChatter: string | null;
  dayShiftChatterId: string | null;
  eveningShiftChatter: string | null;
  eveningShiftChatterId: string | null;
  nightShiftChatter: string | null;
  nightShiftChatterId: string | null;
  generalAssignmentChatter: string | null;
  generalAssignmentChatterId: string | null;
  hasAnyAssignment: boolean;
}

const PlatformAssignmentsOverview: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  
  const { assignments, loading: assignmentsLoading, error: assignmentsError } = useChatterAssignments();
  const { teamMembers } = useTeamMembers();
  const { clients } = useClients();
  const { platforms } = usePlatforms();
  
  // Get all client platforms
  const [allClientPlatforms, setAllClientPlatforms] = useState<any[]>([]);
  const [clientPlatformsLoading, setClientPlatformsLoading] = useState(true);

  React.useEffect(() => {
    const fetchAllClientPlatforms = async () => {
      try {
        setClientPlatformsLoading(true);
        const { data, error } = await supabase
          .from('client_platforms')
          .select(`
            id,
            client_id,
            platform_id,
            account_name,
            username_on_platform,
            profile_url,
            client:clients(id, username, avatar_url),
            platform:platforms(id, name, color, icon)
          `)
          .eq('is_active', true);

        if (error) {
          console.error('Error fetching client platforms:', error);
          return;
        }

        setAllClientPlatforms(data || []);
      } catch (err) {
        console.error('Error fetching client platforms:', err);
      } finally {
        setClientPlatformsLoading(false);
      }
    };

    fetchAllClientPlatforms();
  }, []);

  // Get active chatters by shift
  const chatters = teamMembers.filter(member => 
    member.role === 'chatter' && member.is_active
  );

  const chattersByShift = {
    '10-6': chatters.filter(c => c.shift === '10-6'),
    '6-2': chatters.filter(c => c.shift === '6-2'),
    '2-10': chatters.filter(c => c.shift === '2-10'),
    'unassigned': chatters.filter(c => !c.shift)
  };

  // Process platform assignment data
  const platformAssignmentData: PlatformAssignmentData[] = useMemo(() => {
    if (clientPlatformsLoading || assignmentsLoading) return [];

    return allClientPlatforms.map(clientPlatform => {
      // Find assignments for this specific client platform
      const platformSpecificAssignments = assignments.filter(a => 
        a.client_platform_id === clientPlatform.id
      );

      // Find general assignments for this client (no platform specified)
      const generalAssignments = assignments.filter(a => 
        a.client_id === clientPlatform.client_id && !a.client_platform_id
      );

      // Combine all assignments for this client platform (platform-specific + general)
      const allRelevantAssignments = [...platformSpecificAssignments, ...generalAssignments];

      // Get chatter assignments by shift from ALL relevant assignments (not just platform-specific)
      const dayShiftAssignment = allRelevantAssignments.find(a => 
        (a as any).chatter?.shift === '10-6'
      );
      const eveningShiftAssignment = allRelevantAssignments.find(a => 
        (a as any).chatter?.shift === '6-2'
      );
      const nightShiftAssignment = allRelevantAssignments.find(a => 
        (a as any).chatter?.shift === '2-10'
      );

      // Get general assignment (only show if chatter has no specific shift)
      const generalAssignment = allRelevantAssignments.find(a => 
        !(a as any).chatter?.shift
      );

      return {
        clientPlatformId: clientPlatform.id,
        clientId: clientPlatform.client_id,
        clientUsername: clientPlatform.client?.username || 'Unknown',
        clientAvatarUrl: clientPlatform.client?.avatar_url || null,
        platformId: clientPlatform.platform_id,
        platformName: clientPlatform.platform?.name || 'Unknown',
        platformIcon: clientPlatform.platform?.icon || null,
        platformColor: clientPlatform.platform?.color || '#6366f1',
        accountName: clientPlatform.account_name,
        usernameOnPlatform: clientPlatform.username_on_platform,
        profileUrl: clientPlatform.profile_url,
        dayShiftChatter: dayShiftAssignment ? (dayShiftAssignment as any).chatter?.full_name : null,
        dayShiftChatterId: dayShiftAssignment?.chatter_id || null,
        eveningShiftChatter: eveningShiftAssignment ? (eveningShiftAssignment as any).chatter?.full_name : null,
        eveningShiftChatterId: eveningShiftAssignment?.chatter_id || null,
        nightShiftChatter: nightShiftAssignment ? (nightShiftAssignment as any).chatter?.full_name : null,
        nightShiftChatterId: nightShiftAssignment?.chatter_id || null,
        generalAssignmentChatter: generalAssignment ? (generalAssignment as any).chatter?.full_name : null,
        generalAssignmentChatterId: generalAssignment?.chatter_id || null,
        hasAnyAssignment: allRelevantAssignments.length > 0
      };
    });
  }, [allClientPlatforms, assignments, clientPlatformsLoading, assignmentsLoading]);

  // Apply filters
  const filteredData = useMemo(() => {
    return platformAssignmentData.filter(item => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        item.clientUsername.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.usernameOnPlatform && item.usernameOnPlatform.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.accountName && item.accountName.toLowerCase().includes(searchTerm.toLowerCase()));

      // Platform filter
      const matchesPlatform = platformFilter === 'all' || item.platformId === platformFilter;

      // Shift filter
      const matchesShift = shiftFilter === 'all' || 
        (shiftFilter === '10-6' && item.dayShiftChatterId) ||
        (shiftFilter === '6-2' && item.eveningShiftChatterId) ||
        (shiftFilter === '2-10' && item.nightShiftChatterId) ||
        (shiftFilter === 'general' && item.generalAssignmentChatterId) ||
        (shiftFilter === 'unassigned' && !item.hasAnyAssignment);

      // Assignment filter
      const matchesAssignment = assignmentFilter === 'all' ||
        (assignmentFilter === 'assigned' && item.hasAnyAssignment) ||
        (assignmentFilter === 'unassigned' && !item.hasAnyAssignment);

      return matchesSearch && matchesPlatform && matchesShift && matchesAssignment;
    }).sort((a, b) => {
      // Sort by client username, then platform name, then account name
      const clientCompare = a.clientUsername.localeCompare(b.clientUsername);
      if (clientCompare !== 0) return clientCompare;
      
      const platformCompare = a.platformName.localeCompare(b.platformName);
      if (platformCompare !== 0) return platformCompare;
      
      return (a.accountName || '').localeCompare(b.accountName || '');
    });
  }, [platformAssignmentData, searchTerm, platformFilter, shiftFilter, assignmentFilter]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalAccounts = platformAssignmentData.length;
    const assignedAccounts = platformAssignmentData.filter(item => item.hasAnyAssignment).length;
    const unassignedAccounts = totalAccounts - assignedAccounts;
    
    const shiftStats = {
      dayShift: platformAssignmentData.filter(item => item.dayShiftChatterId).length,
      eveningShift: platformAssignmentData.filter(item => item.eveningShiftChatterId).length,
      nightShift: platformAssignmentData.filter(item => item.nightShiftChatterId).length,
      general: platformAssignmentData.filter(item => item.generalAssignmentChatterId).length
    };

    return {
      totalAccounts,
      assignedAccounts,
      unassignedAccounts,
      assignmentRate: totalAccounts > 0 ? Math.round((assignedAccounts / totalAccounts) * 100) : 0,
      shiftStats
    };
  }, [platformAssignmentData]);

  const handleRefresh = async () => {
    setLoading(true);
    // Trigger refresh of all data
    window.location.reload();
  };

  const handleExport = () => {
    // Create CSV data
    const csvData = [
      ['Client Username', 'Platform', 'Account Name', 'Platform Username', 'Day Shift (10am-6pm)', 'Evening Shift (6pm-2am)', 'Night Shift (2am-10am)', 'General Assignment'],
      ...filteredData.map(item => [
        item.clientUsername,
        item.platformName,
        item.accountName || '',
        item.usernameOnPlatform || '',
        item.dayShiftChatter || '',
        item.eveningShiftChatter || '',
        item.nightShiftChatter || '',
        item.generalAssignmentChatter || ''
      ])
    ];

    const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `platform-assignments-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = assignmentsLoading || clientPlatformsLoading || loading;
  const error = assignmentsError;

  if (isLoading) {
    return (
      <Layout title="Platform Overview">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading platform assignments...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Platform Overview">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">Error loading assignments: {error}</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Platform Overview">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-6 lg:p-8 text-white shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4 backdrop-blur-sm">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold">Platform Assignments Overview</h1>
                <p className="text-blue-100 text-sm lg:text-base">Complete view of all creator-chatter assignments across platforms</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center text-white hover:bg-opacity-30 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleExport}
                className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center text-white hover:bg-opacity-30 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{stats.totalAccounts}</div>
              <div className="text-blue-100 text-sm">Total Accounts</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{stats.assignedAccounts}</div>
              <div className="text-blue-100 text-sm">Assigned</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{stats.unassignedAccounts}</div>
              <div className="text-blue-100 text-sm">Unassigned</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{stats.assignmentRate}%</div>
              <div className="text-blue-100 text-sm">Coverage</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{platforms.length}</div>
              <div className="text-blue-100 text-sm">Platforms</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <Filter className="w-5 h-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Filters & Search</h3>
          </div>
          
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by client username, platform username, or account name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Platform Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                <select
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Platforms</option>
                  {platforms.map((platform) => (
                    <option key={platform.id} value={platform.id}>
                      {platform.icon} {platform.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Shift Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Shift</label>
                <select
                  value={shiftFilter}
                  onChange={(e) => setShiftFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Shifts</option>
                  <option value="10-6">Day Shift (10am-6pm)</option>
                  <option value="6-2">Evening Shift (6pm-2am)</option>
                  <option value="2-10">Night Shift (2am-10am)</option>
                  <option value="general">General Assignment</option>
                  <option value="unassigned">Unassigned</option>
                </select>
              </div>

              {/* Assignment Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Status</label>
                <select
                  value={assignmentFilter}
                  onChange={(e) => setAssignmentFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Accounts</option>
                  <option value="assigned">Assigned Only</option>
                  <option value="unassigned">Unassigned Only</option>
                </select>
              </div>

              {/* View Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">View Mode</label>
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
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
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Grid className="w-4 h-4 mr-2" />
                    Grid
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Platform Assignments ({filteredData.length} of {platformAssignmentData.length})
              </h2>
              <div className="text-sm text-gray-600">
                {stats.assignmentRate}% coverage • {stats.unassignedAccounts} unassigned
              </div>
            </div>
          </div>

          {filteredData.length === 0 ? (
            <div className="text-center py-12">
              <Layers className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No platform accounts found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {platformAssignmentData.length === 0 
                  ? 'No platform accounts have been set up yet.'
                  : 'No accounts match the current filters.'}
              </p>
              {platformAssignmentData.length > 0 && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setPlatformFilter('all');
                    setShiftFilter('all');
                    setAssignmentFilter('all');
                  }}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              {viewMode === 'table' ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Client & Platform
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Platform Username
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Day Shift<br/><span className="text-xs font-normal">(10am-6pm)</span>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Evening Shift<br/><span className="text-xs font-normal">(6pm-2am)</span>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Night Shift<br/><span className="text-xs font-normal">(2am-10am)</span>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          General Assignment
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredData.map((item) => (
                        <tr key={item.clientPlatformId} className={`hover:bg-gray-50 ${!item.hasAnyAssignment ? 'bg-red-50' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <ClientAvatar 
                                client={{ username: item.clientUsername, avatar_url: item.clientAvatarUrl }} 
                                size="md" 
                                className="mr-3" 
                              />
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  @{item.clientUsername}
                                </div>
                                <div className="flex items-center mt-1">
                                  <span className="text-base mr-2">{item.platformIcon}</span>
                                  <div className="text-xs text-gray-600">
                                    <span className="font-medium">{item.platformName}</span>
                                    {item.accountName && (
                                      <span className="ml-1 text-gray-500">({item.accountName})</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.usernameOnPlatform ? (
                              <div className="flex items-center">
                                <span className="font-medium">@{item.usernameOnPlatform}</span>
                                {item.profileUrl && (
                                  <a
                                    href={item.profileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-2 text-blue-600 hover:text-blue-800"
                                  >
                                    <Eye className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">Not set</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {item.dayShiftChatter ? (
                              <div className="flex items-center">
                                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                                  <User className="w-3 h-3 text-blue-600" />
                                </div>
                                <span className="text-blue-900 font-medium">{item.dayShiftChatter}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">Unassigned</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {item.eveningShiftChatter ? (
                              <div className="flex items-center">
                                <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mr-2">
                                  <User className="w-3 h-3 text-purple-600" />
                                </div>
                                <span className="text-purple-900 font-medium">{item.eveningShiftChatter}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">Unassigned</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {item.nightShiftChatter ? (
                              <div className="flex items-center">
                                <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center mr-2">
                                  <User className="w-3 h-3 text-indigo-600" />
                                </div>
                                <span className="text-indigo-900 font-medium">{item.nightShiftChatter}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">Unassigned</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {item.generalAssignmentChatter ? (
                              <div className="flex items-center">
                                <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center mr-2">
                                  <Users className="w-3 h-3 text-gray-600" />
                                </div>
                                <span className="text-gray-900 font-medium">{item.generalAssignmentChatter}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">Unassigned</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                              title="Manage assignments for this account"
                            >
                              <Settings className="w-4 h-4 mr-1" />
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Grid View */
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredData.map((item) => (
                      <div key={item.clientPlatformId} className={`bg-white rounded-lg border-2 p-4 hover:shadow-md transition-shadow ${
                        !item.hasAnyAssignment ? 'border-red-200 bg-red-50' : 'border-gray-200'
                      }`}>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <ClientAvatar 
                              client={{ username: item.clientUsername, avatar_url: item.clientAvatarUrl }} 
                              size="sm" 
                              className="mr-2" 
                            />
                            <div>
                              <div className="text-sm font-medium text-gray-900">@{item.clientUsername}</div>
                              <div className="flex items-center text-xs text-gray-600">
                                <span className="text-base mr-1">{item.platformIcon}</span>
                                {item.platformName}
                                {item.accountName && <span className="ml-1">({item.accountName})</span>}
                              </div>
                            </div>
                          </div>
                          {!item.hasAnyAssignment && (
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          )}
                        </div>

                        {/* Platform Username */}
                        {item.usernameOnPlatform && (
                          <div className="mb-3 p-2 bg-gray-50 rounded-md">
                            <div className="text-xs text-gray-500 mb-1">Platform Username</div>
                            <div className="text-sm font-medium text-gray-900">@{item.usernameOnPlatform}</div>
                          </div>
                        )}

                        {/* Assignments */}
                        <div className="space-y-2">
                          {/* Day Shift */}
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">Day (10am-6pm):</span>
                            {item.dayShiftChatter ? (
                              <span className="text-blue-700 font-medium">{item.dayShiftChatter}</span>
                            ) : (
                              <span className="text-gray-400">Unassigned</span>
                            )}
                          </div>

                          {/* Evening Shift */}
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">Evening (6pm-2am):</span>
                            {item.eveningShiftChatter ? (
                              <span className="text-purple-700 font-medium">{item.eveningShiftChatter}</span>
                            ) : (
                              <span className="text-gray-400">Unassigned</span>
                            )}
                          </div>

                          {/* Night Shift */}
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">Night (2am-10am):</span>
                            {item.nightShiftChatter ? (
                              <span className="text-indigo-700 font-medium">{item.nightShiftChatter}</span>
                            ) : (
                              <span className="text-gray-400">Unassigned</span>
                            )}
                          </div>

                          {/* General Assignment */}
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">General:</span>
                            {item.generalAssignmentChatter ? (
                              <span className="text-gray-700 font-medium">{item.generalAssignmentChatter}</span>
                            ) : (
                              <span className="text-gray-400">Unassigned</span>
                            )}
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="mt-4 pt-3 border-t border-gray-200">
                          <button className="w-full inline-flex items-center justify-center px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm font-medium">
                            <Settings className="w-4 h-4 mr-2" />
                            Manage
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default PlatformAssignmentsOverview;