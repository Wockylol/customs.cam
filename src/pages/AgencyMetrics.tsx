import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, AlertCircle, TrendingUp, DollarSign, Users, Package, Calendar, BarChart3, PieChart, Target, Award, Clock, CheckCircle, ArrowUp, ArrowDown, Filter, Download } from 'lucide-react';
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

const AgencyMetrics: React.FC = () => {
  const { agencySlug } = useParams<{ agencySlug: string }>();
  const [timeFilter, setTimeFilter] = useState<'7d' | '30d' | '90d' | '6m' | '1y' | 'all'>('30d');
  const [comparisonPeriod, setComparisonPeriod] = useState<'previous' | 'year_ago'>('previous');
  
  const { agencies, loading: agenciesLoading, error: agenciesError } = useAgencies();
  const { clients, loading: clientsLoading, error: clientsError } = useClients();
  const { customRequests, loading: customsLoading, error: customsError } = useCustomRequests();

  const agency = agencies.find((a: Agency) => a.slug === agencySlug);
  const agencyClients = clients.filter((c: Client) => c.agency_id === agency?.id);
  const agencyClientIds = agencyClients.map(c => c.id);
  
  const loading = agenciesLoading || clientsLoading || customsLoading;
  const error = agenciesError || clientsError || customsError;

  // Date range calculations
  const getDateRange = (period: string) => {
    const now = new Date();
    const start = new Date();
    
    switch (period) {
      case '7d':
        start.setDate(now.getDate() - 7);
        break;
      case '30d':
        start.setDate(now.getDate() - 30);
        break;
      case '90d':
        start.setDate(now.getDate() - 90);
        break;
      case '6m':
        start.setMonth(now.getMonth() - 6);
        break;
      case '1y':
        start.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        start.setFullYear(2020); // Far back date
        break;
    }
    
    return { start, end: now };
  };

  const getComparisonDateRange = (period: string, comparisonType: string) => {
    const { start, end } = getDateRange(period);
    const duration = end.getTime() - start.getTime();
    
    if (comparisonType === 'previous') {
      return {
        start: new Date(start.getTime() - duration),
        end: new Date(start.getTime())
      };
    } else {
      return {
        start: new Date(start.getFullYear() - 1, start.getMonth(), start.getDate()),
        end: new Date(end.getFullYear() - 1, end.getMonth(), end.getDate())
      };
    }
  };

  // Filter customs by date range
  const filterCustomsByDateRange = (customs: CustomRequest[], dateRange: { start: Date; end: Date }) => {
    return customs.filter(c => {
      const submitDate = new Date(c.date_submitted);
      return submitDate >= dateRange.start && submitDate <= dateRange.end;
    });
  };

  // Current period data
  const currentDateRange = getDateRange(timeFilter);
  const currentPeriodCustoms = filterCustomsByDateRange(
    customRequests.filter(c => agencyClientIds.includes(c.client_id)),
    currentDateRange
  );

  // Comparison period data
  const comparisonDateRange = getComparisonDateRange(timeFilter, comparisonPeriod);
  const comparisonPeriodCustoms = filterCustomsByDateRange(
    customRequests.filter(c => agencyClientIds.includes(c.client_id)),
    comparisonDateRange
  );

  // Metrics calculations
  const currentMetrics = useMemo(() => {
    const revenue = currentPeriodCustoms.reduce((sum, c) => sum + (c.amount_paid || 0), 0);
    const totalCustoms = currentPeriodCustoms.length;
    const completedCustoms = currentPeriodCustoms.filter(c => c.status === 'delivered').length;
    const avgOrderValue = totalCustoms > 0 ? revenue / totalCustoms : 0;
    const conversionRate = totalCustoms > 0 ? (completedCustoms / totalCustoms) * 100 : 0;
    
    return {
      revenue,
      totalCustoms,
      completedCustoms,
      avgOrderValue,
      conversionRate,
      activeClients: new Set(currentPeriodCustoms.map(c => c.client_id)).size
    };
  }, [currentPeriodCustoms]);

  const comparisonMetrics = useMemo(() => {
    const revenue = comparisonPeriodCustoms.reduce((sum, c) => sum + (c.amount_paid || 0), 0);
    const totalCustoms = comparisonPeriodCustoms.length;
    const completedCustoms = comparisonPeriodCustoms.filter(c => c.status === 'delivered').length;
    const avgOrderValue = totalCustoms > 0 ? revenue / totalCustoms : 0;
    const conversionRate = totalCustoms > 0 ? (completedCustoms / totalCustoms) * 100 : 0;
    
    return {
      revenue,
      totalCustoms,
      completedCustoms,
      avgOrderValue,
      conversionRate,
      activeClients: new Set(comparisonPeriodCustoms.map(c => c.client_id)).size
    };
  }, [comparisonPeriodCustoms]);

  // Calculate percentage changes
  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Client performance analysis
  const clientPerformance = useMemo(() => {
    return agencyClients.map(client => {
      const clientCurrentCustoms = currentPeriodCustoms.filter(c => c.client_id === client.id);
      const clientComparisonCustoms = comparisonPeriodCustoms.filter(c => c.client_id === client.id);
      
      const currentRevenue = clientCurrentCustoms.reduce((sum, c) => sum + (c.amount_paid || 0), 0);
      const comparisonRevenue = clientComparisonCustoms.reduce((sum, c) => sum + (c.amount_paid || 0), 0);
      
      return {
        client,
        currentRevenue,
        comparisonRevenue,
        currentCustoms: clientCurrentCustoms.length,
        comparisonCustoms: clientComparisonCustoms.length,
        revenueChange: getPercentageChange(currentRevenue, comparisonRevenue),
        customsChange: getPercentageChange(clientCurrentCustoms.length, clientComparisonCustoms.length),
        avgOrderValue: clientCurrentCustoms.length > 0 ? currentRevenue / clientCurrentCustoms.length : 0
      };
    }).sort((a, b) => b.currentRevenue - a.currentRevenue);
  }, [agencyClients, currentPeriodCustoms, comparisonPeriodCustoms]);

  // Revenue trend data (simplified for display)
  const revenueTrend = useMemo(() => {
    const days = [];
    const { start, end } = currentDateRange;
    const dayCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i < Math.min(dayCount, 30); i++) {
      const date = new Date(start.getTime() + (i * 24 * 60 * 60 * 1000));
      const dayCustoms = currentPeriodCustoms.filter(c => {
        const submitDate = new Date(c.date_submitted);
        return submitDate.toDateString() === date.toDateString();
      });
      const dayRevenue = dayCustoms.reduce((sum, c) => sum + (c.amount_paid || 0), 0);
      
      days.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: dayRevenue,
        customs: dayCustoms.length
      });
    }
    
    return days;
  }, [currentPeriodCustoms, currentDateRange]);

  // Status distribution
  const statusDistribution = useMemo(() => {
    const distribution = currentPeriodCustoms.reduce((acc, custom) => {
      acc[custom.status] = (acc[custom.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(distribution).map(([status, count]) => ({
      status,
      count,
      percentage: (count / currentPeriodCustoms.length) * 100
    }));
  }, [currentPeriodCustoms]);

  if (loading) {
    return (
      <AgencyLayout title="Analytics">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </AgencyLayout>
    );
  }

  if (error) {
    return (
      <AgencyLayout title="Analytics">
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
      <AgencyLayout title="Analytics">
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-900">Agency not found</h2>
          <p className="mt-2 text-gray-600">The requested agency could not be found.</p>
        </div>
      </AgencyLayout>
    );
  }

  return (
    <AgencyLayout title={`${agency.name} - Analytics`}>
      <StaggerContainer className="space-y-6 lg:space-y-8">
        {/* Header with Controls */}
        <div className="bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl p-6 lg:p-8 text-white shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-4 lg:mb-0">
              <div className="flex items-center mb-3">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4 backdrop-blur-sm">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold">Analytics Dashboard</h1>
                  <p className="text-purple-100 text-sm lg:text-base">{agency.name}</p>
                </div>
              </div>
              <p className="text-purple-100 max-w-2xl">
                Comprehensive performance metrics and insights for your agency
              </p>
            </div>
            
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
                  <option value="6m" className="text-gray-900">Last 6 months</option>
                  <option value="1y" className="text-gray-900">Last year</option>
                  <option value="all" className="text-gray-900">All time</option>
                </select>
              </div>
              <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg px-4 py-3">
                <select
                  value={comparisonPeriod}
                  onChange={(e) => setComparisonPeriod(e.target.value as any)}
                  className="bg-transparent text-white text-sm font-medium focus:outline-none"
                >
                  <option value="previous" className="text-gray-900">vs Previous Period</option>
                  <option value="year_ago" className="text-gray-900">vs Year Ago</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Key Performance Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              title: 'Total Revenue',
              current: `$${currentMetrics.revenue.toFixed(2)}`,
              previous: comparisonMetrics.revenue,
              change: getPercentageChange(currentMetrics.revenue, comparisonMetrics.revenue),
              icon: DollarSign,
              color: 'green'
            },
            {
              title: 'Custom Requests',
              current: currentMetrics.totalCustoms.toString(),
              previous: comparisonMetrics.totalCustoms,
              change: getPercentageChange(currentMetrics.totalCustoms, comparisonMetrics.totalCustoms),
              icon: Package,
              color: 'blue'
            },
            {
              title: 'Active Clients',
              current: currentMetrics.activeClients.toString(),
              previous: comparisonMetrics.activeClients,
              change: getPercentageChange(currentMetrics.activeClients, comparisonMetrics.activeClients),
              icon: Users,
              color: 'purple'
            },
            {
              title: 'Avg Order Value',
              current: `$${currentMetrics.avgOrderValue.toFixed(2)}`,
              previous: comparisonMetrics.avgOrderValue,
              change: getPercentageChange(currentMetrics.avgOrderValue, comparisonMetrics.avgOrderValue),
              icon: Target,
              color: 'orange'
            },
            {
              title: 'Completion Rate',
              current: `${currentMetrics.conversionRate.toFixed(1)}%`,
              previous: comparisonMetrics.conversionRate,
              change: getPercentageChange(currentMetrics.conversionRate, comparisonMetrics.conversionRate),
              icon: CheckCircle,
              color: 'teal'
            },
            {
              title: 'Completed Customs',
              current: currentMetrics.completedCustoms.toString(),
              previous: comparisonMetrics.completedCustoms,
              change: getPercentageChange(currentMetrics.completedCustoms, comparisonMetrics.completedCustoms),
              icon: Award,
              color: 'indigo'
            }
          ].map((metric) => {
            const Icon = metric.icon;
            const isPositive = metric.change >= 0;
            
            return (
              <div key={metric.title} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-${metric.color}-100`}>
                    <Icon className={`w-6 h-6 text-${metric.color}-600`} />
                  </div>
                  <div className={`flex items-center text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {isPositive ? <ArrowUp className="w-4 h-4 mr-1" /> : <ArrowDown className="w-4 h-4 mr-1" />}
                    {Math.abs(metric.change).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">{metric.current}</div>
                  <div className="text-sm text-gray-600">{metric.title}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Revenue Trend Chart */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="p-6 lg:p-8 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Revenue Trend</h2>
                  <p className="text-gray-600 text-sm">Daily revenue over selected period</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6 lg:p-8">
            <div className="h-64 flex items-end justify-between space-x-2">
              {revenueTrend.map((day, index) => {
                const maxRevenue = Math.max(...revenueTrend.map(d => d.revenue));
                const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-gray-200 rounded-t-md relative group">
                      <div 
                        className="bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-md transition-all duration-300 hover:from-blue-600 hover:to-blue-500"
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        ${day.revenue.toFixed(0)}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-left">
                      {day.date}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Status Distribution and Client Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Distribution */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                  <PieChart className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Status Distribution</h2>
                  <p className="text-gray-600 text-sm">Custom request status breakdown</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {statusDistribution.map((item) => (
                  <div key={item.status} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        item.status === 'delivered' ? 'bg-green-500' :
                        item.status === 'completed' ? 'bg-purple-500' :
                        item.status === 'in_progress' ? 'bg-yellow-500' :
                        item.status === 'pending_client_approval' ? 'bg-blue-500' :
                        'bg-orange-500'
                      }`} />
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-600 mr-2">{item.count}</span>
                      <span className="text-xs text-gray-500">({item.percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Performing Clients */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center mr-4">
                  <Award className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Top Clients</h2>
                  <p className="text-gray-600 text-sm">Highest revenue generators</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {clientPerformance.slice(0, 5).map((client, index) => (
                  <div key={client.client.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-xs font-bold text-blue-600">#{index + 1}</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">@{client.client.username}</div>
                        <div className="text-xs text-gray-500">{client.currentCustoms} customs</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">${client.currentRevenue.toFixed(0)}</div>
                      <div className={`text-xs flex items-center ${client.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {client.revenueChange >= 0 ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                        {Math.abs(client.revenueChange).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Client Performance Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="p-6 lg:p-8 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-4">
                  <Users className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Client Performance Analysis</h2>
                  <p className="text-gray-600 text-sm">Detailed metrics for all clients</p>
                </div>
              </div>
              <button className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue Change
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customs Change
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Order Value
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clientPerformance.map((client) => (
                  <tr key={client.client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <ClientAvatar client={client.client} size="md" className="mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">@{client.client.username}</div>
                          {client.client.phone && false && (
                            <div className="text-xs text-gray-500">{client.client.phone}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      ${client.currentRevenue.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`flex items-center text-sm font-medium ${client.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {client.revenueChange >= 0 ? <ArrowUp className="w-4 h-4 mr-1" /> : <ArrowDown className="w-4 h-4 mr-1" />}
                        {Math.abs(client.revenueChange).toFixed(1)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {client.currentCustoms}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`flex items-center text-sm font-medium ${client.customsChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {client.customsChange >= 0 ? <ArrowUp className="w-4 h-4 mr-1" /> : <ArrowDown className="w-4 h-4 mr-1" />}
                        {Math.abs(client.customsChange).toFixed(1)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${client.avgOrderValue.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </StaggerContainer>
    </AgencyLayout>
  );
};

export default AgencyMetrics;