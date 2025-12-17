import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, TrendingUp, Clock, CheckCircle, XCircle, Users, Calendar, ArrowRight, Trophy } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useSales } from '../hooks/useSales';
import { StaggerContainer } from '../components/ui/StaggerContainer';

const SalesManagement: React.FC = () => {
  const { sales, loading, error } = useSales();

  // Calculate overall stats (net revenue = gross - 20%)
  const calculateNet = (gross: number) => gross * 0.8;
  
  const stats = useMemo(() => {
    const today = new Date();
    const thisMonth = today.getUTCMonth();
    const thisYear = today.getUTCFullYear();

    const allSales = sales;
    const validSales = sales.filter(s => s.status === 'valid');
    const pendingSales = sales.filter(s => s.status === 'pending');
    const invalidSales = sales.filter(s => s.status === 'invalid');

    // This month's sales - use UTC to ensure consistent month calculation
    const monthSales = sales.filter(s => {
      const d = new Date(s.sale_date + 'T00:00:00Z');
      return d.getUTCMonth() === thisMonth && d.getUTCFullYear() === thisYear;
    });

    const monthValidSales = monthSales.filter(s => s.status === 'valid');

    // Calculate net revenue
    const totalRevenue = validSales.reduce((sum, s) => sum + calculateNet(s.gross_amount), 0);
    const monthRevenue = monthValidSales.reduce((sum, s) => sum + calculateNet(s.gross_amount), 0);
    const avgSale = validSales.length > 0 ? totalRevenue / validSales.length : 0;

    // Chatter stats
    const chatterPerformance = new Map<string, {
      name: string;
      totalSales: number;
      validSales: number;
      revenue: number;
    }>();

    validSales.forEach(sale => {
      const chatterId = sale.chatter_id;
      const current = chatterPerformance.get(chatterId) || {
        name: sale.chatter?.full_name || 'Unknown',
        totalSales: 0,
        validSales: 0,
        revenue: 0,
      };

      current.validSales++;
      current.totalSales++;
      current.revenue += calculateNet(sale.gross_amount);
      chatterPerformance.set(chatterId, current);
    });

    const topChatters = Array.from(chatterPerformance.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Approval rate
    const approvedOrRejected = validSales.length + invalidSales.length;
    const approvalRate = approvedOrRejected > 0 ? (validSales.length / approvedOrRejected) * 100 : 0;

    return {
      total: allSales.length,
      valid: validSales.length,
      pending: pendingSales.length,
      invalid: invalidSales.length,
      totalRevenue,
      monthRevenue,
      avgSale,
      monthSales: monthSales.length,
      monthValidSales: monthValidSales.length,
      approvalRate,
      topChatters,
    };
  }, [sales]);

  if (loading) {
    return (
      <Layout title="Sales Management">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading sales data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Sales Management">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <p className="text-sm text-red-800 dark:text-red-200">Error loading sales: {error}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Sales Management">
      <StaggerContainer className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-6 lg:p-8 text-white shadow-2xl">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4 backdrop-blur-sm">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">Sales Management Hub</h1>
              <p className="text-purple-100 text-sm lg:text-base">Overview of all chatter sales performance</p>
            </div>
          </div>

          {/* Overall Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="text-purple-100 text-sm mb-1">Total Sales</div>
              <div className="text-3xl font-bold">{stats.total}</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="text-purple-100 text-sm mb-1">Valid</div>
              <div className="text-3xl font-bold text-green-200">{stats.valid}</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="text-purple-100 text-sm mb-1">Pending</div>
              <div className="text-3xl font-bold text-yellow-200">{stats.pending}</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="text-purple-100 text-sm mb-1">Invalid</div>
              <div className="text-3xl font-bold text-red-200">{stats.invalid}</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="text-purple-100 text-sm mb-1">Net Revenue</div>
              <div className="text-3xl font-bold">${stats.totalRevenue.toFixed(0)}</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="text-purple-100 text-sm mb-1">Approval Rate</div>
              <div className="text-3xl font-bold">{stats.approvalRate.toFixed(0)}%</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pending Approvals */}
          <Link
            to="/sales-management/pending"
            className="block bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl p-6 text-white hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-10 h-10" />
              <ArrowRight className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Pending Approvals</h3>
            <p className="text-yellow-100 mb-4">Review and approve chatter sales</p>
            <div className="text-4xl font-bold">{stats.pending}</div>
            <p className="text-sm text-yellow-100 mt-2">sales awaiting review</p>
          </Link>

          {/* All Sales */}
          <Link
            to="/sales-management/all-sales"
            className="block bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl p-6 text-white hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <Calendar className="w-10 h-10" />
              <ArrowRight className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold mb-2">View All Sales</h3>
            <p className="text-blue-100 mb-4">Monthly calendar and table view</p>
            <div className="text-4xl font-bold">{stats.monthSales}</div>
            <p className="text-sm text-blue-100 mt-2">sales this month</p>
          </Link>

          {/* Performance */}
          <Link
            to="/sales-management/performance"
            className="block bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl p-6 text-white hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-10 h-10" />
              <ArrowRight className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Chatter Performance</h3>
            <p className="text-green-100 mb-4">Individual performance metrics</p>
            <div className="text-4xl font-bold">${stats.monthRevenue.toFixed(0)}</div>
            <p className="text-sm text-green-100 mt-2">revenue this month</p>
          </Link>
        </div>

        {/* This Month Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">This Month's Performance</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="flex items-center text-gray-600 dark:text-gray-400 mb-2">
                <TrendingUp className="w-5 h-5 mr-2" />
                <span className="text-sm">Total Sales</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.monthSales}</div>
            </div>
            <div>
              <div className="flex items-center text-gray-600 dark:text-gray-400 mb-2">
                <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                <span className="text-sm">Valid Sales</span>
              </div>
              <div className="text-3xl font-bold text-green-600">{stats.monthValidSales}</div>
            </div>
            <div>
              <div className="flex items-center text-gray-600 dark:text-gray-400 mb-2">
                <DollarSign className="w-5 h-5 mr-2 text-blue-500" />
                <span className="text-sm">Revenue</span>
              </div>
              <div className="text-3xl font-bold text-blue-600">${stats.monthRevenue.toFixed(0)}</div>
            </div>
            <div>
              <div className="flex items-center text-gray-600 dark:text-gray-400 mb-2">
                <DollarSign className="w-5 h-5 mr-2 text-purple-500" />
                <span className="text-sm">Avg Sale</span>
              </div>
              <div className="text-3xl font-bold text-purple-600">${stats.avgSale.toFixed(0)}</div>
            </div>
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-6">
            <Trophy className="w-6 h-6 text-yellow-500 mr-2" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Top Performing Chatters</h2>
          </div>
          {stats.topChatters.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No sales data available</p>
          ) : (
            <div className="space-y-4">
              {stats.topChatters.map((chatter, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{chatter.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {chatter.validSales} valid sales
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      ${chatter.revenue.toFixed(0)}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Avg: ${(chatter.revenue / chatter.validSales).toFixed(0)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </StaggerContainer>
    </Layout>
  );
};

export default SalesManagement;

