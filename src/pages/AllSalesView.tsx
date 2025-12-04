import React, { useState, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, DollarSign, TrendingUp, Users, CheckCircle, Clock, XCircle, Eye } from 'lucide-react';
import Layout from '../components/layout/Layout';
import SaleApprovalModal from '../components/modals/SaleApprovalModal';
import { useSales } from '../hooks/useSales';

const AllSalesView: React.FC = () => {
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');
  const { sales, loading, error, approveSale, updateSale } = useSales();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // Calculate net revenue (gross - 20%)
  const calculateNet = (gross: number) => gross * 0.8;

  // Get sales for current month
  const monthlySales = useMemo(() => {
    return sales.filter(sale => {
      const saleDate = new Date(sale.sale_date);
      return saleDate.getFullYear() === year && saleDate.getMonth() === month;
    });
  }, [sales, year, month]);

  // Calculate monthly stats
  const monthlyStats = useMemo(() => {
    const validSales = monthlySales.filter(s => s.status === 'valid');
    const pendingSales = monthlySales.filter(s => s.status === 'pending');
    const invalidSales = monthlySales.filter(s => s.status === 'invalid');
    
    const totalRevenue = validSales.reduce((sum, s) => sum + calculateNet(s.gross_amount), 0);
    const avgSale = validSales.length > 0 ? totalRevenue / validSales.length : 0;

    // Get unique chatters
    const uniqueChatters = new Set(monthlySales.map(s => s.chatter_id));

    return {
      total: monthlySales.length,
      valid: validSales.length,
      pending: pendingSales.length,
      invalid: invalidSales.length,
      revenue: totalRevenue,
      avgSale,
      chatters: uniqueChatters.size,
    };
  }, [monthlySales]);

  // Get calendar days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ date: null, sales: [] });
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const daySales = monthlySales.filter(sale => sale.sale_date === dateStr);
      days.push({ date: day, sales: daySales });
    }

    return days;
  }, [year, month, monthlySales]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleSaleClick = (sale: any) => {
    setSelectedSale(sale);
    setIsModalOpen(true);
  };

  const handleApprove = async (saleId: string, approved: boolean, notes?: string) => {
    const { error } = await approveSale(saleId, approved, notes);
    if (!error) {
      setIsModalOpen(false);
      setSelectedSale(null);
    }
    return { error };
  };

  if (loading) {
    return (
      <Layout title="All Sales">
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
      <Layout title="All Sales">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <p className="text-sm text-red-800 dark:text-red-200">Error loading sales: {error}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="All Sales">
      <div className="space-y-6">
        {/* Header with Stats */}
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-6 lg:p-8 text-white shadow-2xl">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4 backdrop-blur-sm">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">Sales Overview</h1>
              <p className="text-blue-100 text-sm lg:text-base">
                {monthNames[month]} {year}
              </p>
            </div>
          </div>

          {/* Monthly Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="text-blue-100 text-sm mb-1">Total Sales</div>
              <div className="text-2xl font-bold">{monthlyStats.total}</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="text-blue-100 text-sm mb-1">Valid</div>
              <div className="text-2xl font-bold text-green-200">{monthlyStats.valid}</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="text-blue-100 text-sm mb-1">Pending</div>
              <div className="text-2xl font-bold text-yellow-200">{monthlyStats.pending}</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="text-blue-100 text-sm mb-1">Invalid</div>
              <div className="text-2xl font-bold text-red-200">{monthlyStats.invalid}</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="text-blue-100 text-sm mb-1">Net Revenue</div>
              <div className="text-2xl font-bold">${monthlyStats.revenue.toFixed(0)}</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="text-blue-100 text-sm mb-1">Avg Net Sale</div>
              <div className="text-2xl font-bold">${monthlyStats.avgSale.toFixed(0)}</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="text-blue-100 text-sm mb-1">Chatters</div>
              <div className="text-2xl font-bold">{monthlyStats.chatters}</div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={previousMonth}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={goToToday}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Today
              </button>
              <button
                onClick={nextMonth}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Calendar className="w-4 h-4 inline mr-2" />
                Calendar
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  viewMode === 'table'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <TrendingUp className="w-4 h-4 inline mr-2" />
                Table
              </button>
            </div>
          </div>
        </div>

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900">
                  <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase border-r border-gray-200 dark:border-gray-700">
                    Chatter
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase border-r border-gray-200 dark:border-gray-700">
                    Total<br/>Sales
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase border-r border-gray-200 dark:border-gray-700">
                    Net<br/>Revenue
                  </th>
                  {Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => i + 1).map(day => {
                    const date = new Date(year, month, day);
                    const dayOfWeek = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][date.getDay()];
                    const isToday = day === new Date().getDate() && 
                                   month === new Date().getMonth() && 
                                   year === new Date().getFullYear();
                    
                    return (
                      <th 
                        key={day} 
                        className={`px-2 py-3 text-center text-xs font-medium border-r border-gray-200 dark:border-gray-700 ${
                          isToday ? 'bg-blue-100 dark:bg-blue-900/30' : ''
                        }`}
                      >
                        <div className={`${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          {dayOfWeek}
                        </div>
                        <div className={`font-semibold ${isToday ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                          {day}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {(() => {
                  // Group sales by chatter
                  const chatterSalesMap = new Map();
                  monthlySales.forEach(sale => {
                    const chatterId = sale.chatter_id;
                    if (!chatterSalesMap.has(chatterId)) {
                      chatterSalesMap.set(chatterId, {
                        id: chatterId,
                        name: sale.chatter?.full_name || 'Unknown',
                        sales: [],
                      });
                    }
                    chatterSalesMap.get(chatterId).sales.push(sale);
                  });

                  const chatters = Array.from(chatterSalesMap.values()).sort((a, b) => 
                    a.name.localeCompare(b.name)
                  );

                  if (chatters.length === 0) {
                    return (
                      <tr>
                        <td colSpan={100} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                          No sales for this month
                        </td>
                      </tr>
                    );
                  }

                  return chatters.map((chatter) => {
                    const chatterTotalSales = chatter.sales.length;
                    const chatterTotalRevenue = chatter.sales.reduce((sum, s) => sum + calculateNet(s.gross_amount), 0);

                    return (
                      <tr key={chatter.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        {/* Chatter name */}
                        <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 px-4 py-3 text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                          {chatter.name}
                        </td>
                        
                        {/* Total sales */}
                        <td className="px-3 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                          {chatterTotalSales}
                        </td>
                        
                        {/* Total revenue */}
                        <td className="px-3 py-3 text-center text-sm font-semibold text-green-600 dark:text-green-400 border-r border-gray-200 dark:border-gray-700">
                          ${chatterTotalRevenue.toFixed(0)}
                        </td>
                        
                        {/* Days */}
                        {Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => i + 1).map(day => {
                          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const daySales = chatter.sales.filter(s => s.sale_date === dateStr);
                          const isToday = day === new Date().getDate() && 
                                         month === new Date().getMonth() && 
                                         year === new Date().getFullYear();

                          return (
                            <td 
                              key={day} 
                              className={`px-2 py-3 text-center text-xs border-r border-gray-200 dark:border-gray-700 ${
                                isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                              }`}
                            >
                              {daySales.length > 0 ? (
                                (() => {
                                  const totalNetAmount = daySales.reduce((sum, s) => sum + calculateNet(s.gross_amount), 0);
                                  const hasPending = daySales.some(s => s.status === 'pending');
                                  const validCount = daySales.filter(s => s.status === 'valid').length;
                                  const pendingCount = daySales.filter(s => s.status === 'pending').length;
                                  const invalidCount = daySales.filter(s => s.status === 'invalid').length;
                                  
                                  return (
                                    <button
                                      onClick={() => handleSaleClick(daySales[0])}
                                      className="w-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 rounded p-1 transition-colors"
                                      title={`${daySales.length} sale${daySales.length !== 1 ? 's' : ''} | Valid: ${validCount}, Pending: ${pendingCount}, Invalid: ${invalidCount} | Net: $${totalNetAmount.toFixed(0)}`}
                                    >
                                      <div className={`font-semibold ${
                                        hasPending 
                                          ? 'text-red-600 dark:text-red-400' 
                                          : 'text-green-600 dark:text-green-400'
                                      }`}>
                                        ${totalNetAmount.toFixed(0)}
                                      </div>
                                    </button>
                                  );
                                })()
                              ) : (
                                <div className="text-gray-300 dark:text-gray-700">-</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Chatter</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Model</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Net Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {monthlySales.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        No sales for this month
                      </td>
                    </tr>
                  ) : (
                    monthlySales
                      .sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime())
                      .map((sale) => (
                        <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {new Date(sale.sale_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {sale.chatter?.full_name || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              @{sale.clients?.username || 'Unknown'}
                            </span>
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
                              {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <button
                              onClick={() => handleSaleClick(sale)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              <Eye className="w-4 h-4 inline mr-1" />
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
        )}

        <SaleApprovalModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedSale(null);
          }}
          sale={selectedSale}
          onApprove={handleApprove}
          onUpdate={async (saleId, updates) => {
            const { error } = await updateSale(saleId, updates);
            return { error };
          }}
        />
      </div>
    </Layout>
  );
};

export default AllSalesView;

