import React, { useState, useMemo } from 'react';
import { TrendingUp, DollarSign, CheckCircle, Clock, XCircle, Calendar, Target, Eye } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useSales } from '../hooks/useSales';
import SaleApprovalModal from '../components/modals/SaleApprovalModal';
import { StaggerContainer } from '../components/ui/StaggerContainer';

const ChatterPerformance: React.FC = () => {
  const [selectedChatterId, setSelectedChatterId] = useState<string | null>(null);
  const [timeFrame, setTimeFrame] = useState<'all' | 'month' | 'week'>('month');
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { sales, loading, error, approveSale, updateSale } = useSales();
  
  // Calculate net revenue (gross - 20%)
  const calculateNet = (gross: number) => gross * 0.8;
  
  // Helper to format date without timezone issues
  const formatLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('T')[0].split('-');
    return `${month}/${day}/${year}`;
  };

  // Helper to format date for charts (short format)
  const formatChartDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('T')[0].split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Calculate chatter stats
  const chatterStats = useMemo(() => {
    const today = new Date();
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats = new Map<string, {
      id: string;
      name: string;
      totalSales: number;
      validSales: number;
      pendingSales: number;
      invalidSales: number;
      totalRevenue: number;
      avgSale: number;
      approvalRate: number;
    }>();

    // Filter sales by timeframe
    const filteredSales = sales.filter(sale => {
      const saleDate = new Date(sale.sale_date);
      if (timeFrame === 'month') {
        return saleDate.getMonth() === thisMonth && saleDate.getFullYear() === thisYear;
      } else if (timeFrame === 'week') {
        return saleDate >= oneWeekAgo;
      }
      return true;
    });

    filteredSales.forEach(sale => {
      const chatterId = sale.chatter_id;
      const chatterName = sale.chatter?.full_name || 'Unknown';

      const current = stats.get(chatterId) || {
        id: chatterId,
        name: chatterName,
        totalSales: 0,
        validSales: 0,
        pendingSales: 0,
        invalidSales: 0,
        totalRevenue: 0,
        avgSale: 0,
        approvalRate: 0,
      };

      current.totalSales++;
      if (sale.status === 'valid') {
        current.validSales++;
        current.totalRevenue += calculateNet(sale.gross_amount);
      } else if (sale.status === 'pending') {
        current.pendingSales++;
      } else if (sale.status === 'invalid') {
        current.invalidSales++;
      }

      stats.set(chatterId, current);
    });

    // Calculate derived stats
    stats.forEach((stat) => {
      stat.avgSale = stat.validSales > 0 ? stat.totalRevenue / stat.validSales : 0;
      const approvedOrRejected = stat.validSales + stat.invalidSales;
      stat.approvalRate = approvedOrRejected > 0 ? (stat.validSales / approvedOrRejected) * 100 : 0;
    });

    return Array.from(stats.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [sales, timeFrame]);

  const selectedChatter = useMemo(() => {
    return chatterStats.find(c => c.id === selectedChatterId) || chatterStats[0] || null;
  }, [chatterStats, selectedChatterId]);

  // Get filtered sales for the selected chatter
  const chatterSales = useMemo(() => {
    if (!selectedChatter) return [];

    const today = new Date();
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    return sales
      .filter(sale => {
        // Filter by chatter
        if (sale.chatter_id !== selectedChatter.id) return false;

        // Filter by timeframe
        const saleDate = new Date(sale.sale_date);
        if (timeFrame === 'month') {
          return saleDate.getMonth() === thisMonth && saleDate.getFullYear() === thisYear;
        } else if (timeFrame === 'week') {
          return saleDate >= oneWeekAgo;
        }
        return true;
      })
      .sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());
  }, [sales, selectedChatter, timeFrame]);

  // Get daily sales for selected chatter
  const dailySales = useMemo(() => {
    if (!selectedChatter) return [];

    const chatterId = selectedChatter.id;
    const today = new Date();
    const daysToShow = timeFrame === 'week' ? 7 : timeFrame === 'month' ? 30 : 90;

    const dailyData = [];
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const daySales = sales.filter(s =>
        s.chatter_id === chatterId &&
        s.sale_date === dateStr &&
        s.status === 'valid'
      );

      dailyData.push({
        date: dateStr,
        sales: daySales.length,
        revenue: daySales.reduce((sum, s) => sum + calculateNet(s.gross_amount), 0),
      });
    }

    return dailyData;
  }, [sales, selectedChatter, timeFrame]);

  if (loading) {
    return (
      <Layout title="Chatter Performance">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading performance data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Chatter Performance">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <p className="text-sm text-red-800 dark:text-red-200">Error loading data: {error}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Chatter Performance">
      <StaggerContainer className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl p-6 lg:p-8 text-white shadow-2xl">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4 backdrop-blur-sm">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">Chatter Performance</h1>
              <p className="text-green-100 text-sm lg:text-base">Individual sales metrics and analytics</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Chatter
              </label>
              <select
                value={selectedChatter?.id || ''}
                onChange={(e) => setSelectedChatterId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                {chatterStats.map((chatter) => (
                  <option key={chatter.id} value={chatter.id}>
                    {chatter.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Time Frame
              </label>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setTimeFrame('week')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    timeFrame === 'week'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setTimeFrame('month')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    timeFrame === 'month'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Month
                </button>
                <button
                  onClick={() => setTimeFrame('all')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    timeFrame === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  All Time
                </button>
              </div>
            </div>
          </div>
        </div>

        {selectedChatter && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* LEFT COLUMN - Detailed Sales Table (2/3 width) */}
            <div className="xl:col-span-2 space-y-6">
              {/* Detailed Sales Table */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Detailed Sales for {selectedChatter.name}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {chatterSales.length} sale{chatterSales.length !== 1 ? 's' : ''} in selected time frame
                    </p>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date & Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Model</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Gross</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Net</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {chatterSales.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                            No sales found for this time frame
                          </td>
                        </tr>
                      ) : (
                        chatterSales.map((sale) => (
                          <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              <div className="flex flex-col">
                                <div className="flex items-center">
                                  <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                  {formatLocalDate(sale.sale_date)}
                                </div>
                                {sale.sale_time && (
                                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {sale.sale_time}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className="text-blue-600 dark:text-blue-400 font-medium">
                                @{sale.clients?.username || 'Unknown'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                              ${sale.gross_amount.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400">
                              ${calculateNet(sale.gross_amount).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                sale.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  : sale.status === 'valid'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              }`}>
                                {sale.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                                {sale.status === 'valid' && <CheckCircle className="w-3 h-3 mr-1" />}
                                {sale.status === 'invalid' && <XCircle className="w-3 h-3 mr-1" />}
                                {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              <button
                                onClick={() => {
                                  setSelectedSale(sale);
                                  setIsModalOpen(true);
                                }}
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 inline-flex items-center"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN - Metrics & Charts (1/3 width) */}
            <div className="xl:col-span-1 space-y-6">
              {/* Key Metrics - Compact */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Performance Metrics</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      <span className="text-sm">Total Sales</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{selectedChatter.totalSales}</div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                      <span className="text-sm">Valid Sales</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">{selectedChatter.validSales}</div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <DollarSign className="w-4 h-4 mr-2 text-blue-500" />
                      <span className="text-sm">Revenue</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">${selectedChatter.totalRevenue.toFixed(0)}</div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <Target className="w-4 h-4 mr-2 text-purple-500" />
                      <span className="text-sm">Approval Rate</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-600">{selectedChatter.approvalRate.toFixed(0)}%</div>
                  </div>
                </div>
              </div>

              {/* Status Breakdown - Compact */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Status Breakdown</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="w-6 h-6 text-green-500 mr-3" />
                      <span className="text-sm text-green-600 dark:text-green-400">Valid</span>
                    </div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">{selectedChatter.validSales}</div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="flex items-center">
                      <Clock className="w-6 h-6 text-yellow-500 mr-3" />
                      <span className="text-sm text-yellow-600 dark:text-yellow-400">Pending</span>
                    </div>
                    <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{selectedChatter.pendingSales}</div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="flex items-center">
                      <XCircle className="w-6 h-6 text-red-500 mr-3" />
                      <span className="text-sm text-red-600 dark:text-red-400">Invalid</span>
                    </div>
                    <div className="text-xl font-bold text-red-600 dark:text-red-400">{selectedChatter.invalidSales}</div>
                  </div>
                </div>
              </div>

              {/* Daily Performance Chart - Compact */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Daily Performance</h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {dailySales.filter(d => d.sales > 0).length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8 text-sm">No valid sales in this period</p>
                  ) : (
                    dailySales.filter(d => d.sales > 0).slice(-14).map((day, index) => {
                      const maxRevenue = Math.max(...dailySales.map(d => d.revenue));
                      const percentage = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;

                      return (
                        <div key={index} className="flex items-center space-x-2">
                          <div className="w-16 text-xs text-gray-600 dark:text-gray-400">
                            {formatChartDate(day.date)}
                          </div>
                          <div className="flex-1">
                            <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-6 relative">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-full h-6 flex items-center px-2"
                                style={{ width: `${Math.max(percentage, 5)}%` }}
                              >
                                <span className="text-white text-xs font-medium">
                                  {day.sales}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="w-16 text-right text-xs font-semibold text-green-600 dark:text-green-400">
                            ${day.revenue.toFixed(0)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <SaleApprovalModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedSale(null);
          }}
          sale={selectedSale}
          onApprove={async (saleId, status, notes) => {
            const { error } = await approveSale(saleId, status, notes);
            return { error };
          }}
          onUpdate={async (saleId, updates) => {
            const { error } = await updateSale(saleId, updates);
            return { error };
          }}
        />
      </StaggerContainer>
    </Layout>
  );
};

export default ChatterPerformance;

