import React, { useState, useMemo } from 'react';
import { TrendingUp, DollarSign, CheckCircle, Clock, XCircle, Calendar, Award, Target } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useSales } from '../hooks/useSales';

const ChatterPerformance: React.FC = () => {
  const [selectedChatterId, setSelectedChatterId] = useState<string | null>(null);
  const [timeFrame, setTimeFrame] = useState<'all' | 'month' | 'week'>('month');
  const { sales, loading, error } = useSales();
  
  // Calculate net revenue (gross - 20%)
  const calculateNet = (gross: number) => gross * 0.8;
  
  // Helper to format date without timezone issues
  const formatLocalDate = (dateStr: string) => {
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
    stats.forEach((stat, chatterId) => {
      stat.avgSale = stat.validSales > 0 ? stat.totalRevenue / stat.validSales : 0;
      const approvedOrRejected = stat.validSales + stat.invalidSales;
      stat.approvalRate = approvedOrRejected > 0 ? (stat.validSales / approvedOrRejected) * 100 : 0;
    });

    return Array.from(stats.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [sales, timeFrame]);

  const selectedChatter = useMemo(() => {
    return chatterStats.find(c => c.id === selectedChatterId) || chatterStats[0] || null;
  }, [chatterStats, selectedChatterId]);

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
      <div className="space-y-6">
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
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center text-gray-600 dark:text-gray-400 mb-2">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  <span className="text-sm">Total Sales</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{selectedChatter.totalSales}</div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center text-gray-600 dark:text-gray-400 mb-2">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                  <span className="text-sm">Valid Sales</span>
                </div>
                <div className="text-3xl font-bold text-green-600">{selectedChatter.validSales}</div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center text-gray-600 dark:text-gray-400 mb-2">
                  <DollarSign className="w-5 h-5 mr-2 text-blue-500" />
                  <span className="text-sm">Total Revenue</span>
                </div>
                <div className="text-3xl font-bold text-blue-600">${selectedChatter.totalRevenue.toFixed(0)}</div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center text-gray-600 dark:text-gray-400 mb-2">
                  <Target className="w-5 h-5 mr-2 text-purple-500" />
                  <span className="text-sm">Approval Rate</span>
                </div>
                <div className="text-3xl font-bold text-purple-600">{selectedChatter.approvalRate.toFixed(0)}%</div>
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Status Breakdown</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div>
                    <div className="text-sm text-green-600 dark:text-green-400 mb-1">Valid</div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">{selectedChatter.validSales}</div>
                  </div>
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>

                <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div>
                    <div className="text-sm text-yellow-600 dark:text-yellow-400 mb-1">Pending</div>
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{selectedChatter.pendingSales}</div>
                  </div>
                  <Clock className="w-10 h-10 text-yellow-500" />
                </div>

                <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div>
                    <div className="text-sm text-red-600 dark:text-red-400 mb-1">Invalid</div>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">{selectedChatter.invalidSales}</div>
                  </div>
                  <XCircle className="w-10 h-10 text-red-500" />
                </div>
              </div>
            </div>

            {/* Performance Chart (Simple bars) */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Daily Performance</h2>
              <div className="space-y-2">
                {dailySales.filter(d => d.sales > 0).length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">No valid sales in this period</p>
                ) : (
                  dailySales.filter(d => d.sales > 0).slice(-14).map((day, index) => {
                    const maxRevenue = Math.max(...dailySales.map(d => d.revenue));
                    const percentage = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;

                    return (
                      <div key={index} className="flex items-center space-x-4">
                        <div className="w-20 text-sm text-gray-600 dark:text-gray-400">
                          {formatLocalDate(day.date)}
                        </div>
                        <div className="flex-1">
                          <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-8 relative">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-full h-8 flex items-center px-3"
                              style={{ width: `${Math.max(percentage, 5)}%` }}
                            >
                              <span className="text-white text-sm font-medium">
                                {day.sales} sale{day.sales !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="w-24 text-right text-sm font-semibold text-green-600 dark:text-green-400">
                          ${day.revenue.toFixed(0)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}

        {/* All Chatters Comparison */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">All Chatters Comparison</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Rank</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Chatter</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Valid</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Net Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Avg Net Sale</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Approval Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {chatterStats.map((chatter, index) => (
                  <tr key={chatter.id} className={`${selectedChatter?.id === chatter.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-gray-300'
                      }`}>
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {chatter.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {chatter.totalSales}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400">
                      {chatter.validSales}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600 dark:text-blue-400">
                      ${chatter.totalRevenue.toFixed(0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600 dark:text-purple-400">
                      ${chatter.avgSale.toFixed(0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                          <div
                            className="bg-green-500 rounded-full h-2"
                            style={{ width: `${chatter.approvalRate}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-900 dark:text-white">{chatter.approvalRate.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ChatterPerformance;

