import React, { useState, useMemo } from 'react';
import { DollarSign, Plus, Search, Calendar, TrendingUp, ChevronUp, ChevronDown, Image as ImageIcon, User, Edit, Trash2, Clock, CheckCircle, XCircle } from 'lucide-react';
import Layout from '../components/layout/Layout';
import AddSaleModal from '../components/modals/AddSaleModal';
import { useSales } from '../hooks/useSales';
import { useAuth } from '../contexts/AuthContext';

const SalesTracker: React.FC = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [sortField, setSortField] = useState<'date' | 'model' | 'amount' | null>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'valid' | 'invalid'>('all');
  const { sales, loading, error, addSale, fetchSales, deleteSale } = useSales();
  const { teamMember } = useAuth();

  // Filter sales based on search, month, and status
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const matchesSearch = searchTerm === '' || 
        sale.clients?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.notes?.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesMonth = true;
      if (selectedMonth !== 'all') {
        const saleDate = new Date(sale.sale_date);
        const saleMonthYear = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`;
        matchesMonth = saleMonthYear === selectedMonth;
      }
      
      const matchesStatus = statusFilter === 'all' || sale.status === statusFilter;
      
      return matchesSearch && matchesMonth && matchesStatus;
    });
  }, [sales, searchTerm, selectedMonth, statusFilter]);

  // Calculate metrics (net revenue = gross - 20%)
  const calculateNet = (gross: number) => gross * 0.8;
  const totalSales = filteredSales.length;
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + calculateNet(sale.gross_amount), 0);
  const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0;
  const pendingSales = sales.filter(s => s.status === 'pending').length;
  const validSales = sales.filter(s => s.status === 'valid').length;
  const invalidSales = sales.filter(s => s.status === 'invalid').length;
  
  // Get unique months from sales for filter
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    sales.forEach(sale => {
      const date = new Date(sale.sale_date);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.add(monthYear);
    });
    return Array.from(months).sort().reverse();
  }, [sales]);

  const formatMonthDisplay = (monthYear: string) => {
    const [year, month] = monthYear.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const handleSort = (field: 'date' | 'model' | 'amount') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortedSales = (salesList: typeof filteredSales) => {
    if (!sortField) {
      return salesList;
    }

    return [...salesList].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'date':
          aValue = new Date(a.sale_date).getTime();
          bValue = new Date(b.sale_date).getTime();
          break;
        case 'model':
          aValue = a.clients?.username || '';
          bValue = b.clients?.username || '';
          break;
        case 'amount':
          aValue = a.gross_amount || 0;
          bValue = b.gross_amount || 0;
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

  const SortButton: React.FC<{ field: 'date' | 'model' | 'amount'; children: React.ReactNode }> = ({ field, children }) => {
    const isActive = sortField === field;
    const isAsc = isActive && sortDirection === 'asc';
    
    return (
      <button
        onClick={() => handleSort(field)}
        className="flex items-center space-x-1 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
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

  const handleAddSale = async (saleData: {
    clientId: string;
    saleDate: string;
    saleTime?: string;
    grossAmount: number;
    screenshotUrl?: string;
    notes?: string;
  }) => {
    const { error } = await addSale(saleData);
    if (!error) {
      setIsAddModalOpen(false);
    }
    return { error };
  };

  const handleDeleteSale = async (saleId: string) => {
    if (window.confirm('Are you sure you want to delete this sale?')) {
      await deleteSale(saleId);
    }
  };

  if (loading) {
    return (
      <Layout title="Sales Tracker">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading your sales...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Sales Tracker">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <p className="text-sm text-red-800 dark:text-red-200">Error loading sales: {error}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Sales Tracker">
      <div className="space-y-6">
        {/* Header with Stats */}
        <div className="bg-gradient-to-br from-green-500 to-blue-600 rounded-2xl p-6 lg:p-8 text-white shadow-2xl">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4 backdrop-blur-sm">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">Sales Tracker</h1>
              <p className="text-blue-100 text-sm lg:text-base">Track and manage your sales performance</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-100 text-sm">Total Sales</span>
                <TrendingUp className="w-5 h-5 text-blue-100" />
              </div>
              <div className="text-3xl font-bold">{totalSales}</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-100 text-sm">Net Revenue</span>
                <DollarSign className="w-5 h-5 text-blue-100" />
              </div>
              <div className="text-3xl font-bold">${totalRevenue.toFixed(2)}</div>
              <div className="text-xs text-blue-100 opacity-75">After 20% commission</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-100 text-sm">Avg Net Sale</span>
                <DollarSign className="w-5 h-5 text-blue-100" />
              </div>
              <div className="text-3xl font-bold">${averageSale.toFixed(2)}</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-100 text-sm">Pending</span>
                <Clock className="w-5 h-5 text-blue-100" />
              </div>
              <div className="text-3xl font-bold">{pendingSales}</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-100 text-sm">Valid</span>
                <TrendingUp className="w-5 h-5 text-blue-100" />
              </div>
              <div className="text-3xl font-bold">{validSales}</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-100 text-sm">Invalid</span>
                <TrendingUp className="w-5 h-5 text-blue-100" />
              </div>
              <div className="text-3xl font-bold">{invalidSales}</div>
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your Sales</h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                {filteredSales.length} {filteredSales.length === 1 ? 'sale' : 'sales'}
                {selectedMonth !== 'all' && ` in ${formatMonthDisplay(selectedMonth)}`}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Add Sale Button */}
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Sale
              </button>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search sales..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-48 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="valid">Valid</option>
                <option value="invalid">Invalid</option>
              </select>

              {/* Month Filter */}
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Months</option>
                {availableMonths.map(month => (
                  <option key={month} value={month}>
                    {formatMonthDisplay(month)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Sales Table */}
        {filteredSales.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            {sales.length === 0 ? (
              <>
                <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No sales yet</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  You haven't added any sales yet. Start tracking your performance by adding your first sale!
                </p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Sale
                </button>
              </>
            ) : (
              <>
                <Search className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No matching sales found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  No sales match your current filters. Try adjusting your search or filters.
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedMonth('all');
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
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <SortButton field="date">Date</SortButton>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <SortButton field="model">Model</SortButton>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <SortButton field="amount">Net Amount</SortButton>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Screenshot
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {getSortedSales(filteredSales).map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <div className="flex flex-col">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            {new Date(sale.sale_date).toLocaleDateString()}
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
                        {sale.clients ? (
                          <div className="flex items-center">
                            {sale.clients.avatar_url ? (
                              <img 
                                src={sale.clients.avatar_url} 
                                alt={sale.clients.username}
                                className="w-8 h-8 rounded-full mr-2"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium mr-2">
                                {sale.clients.username.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              @{sale.clients.username}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">Unknown Client</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400">
                        <div className="flex items-center">
                          <DollarSign className="w-4 h-4 mr-1" />
                          {calculateNet(sale.gross_amount).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {sale.screenshot_url ? (
                          <a 
                            href={sale.screenshot_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center"
                          >
                            <ImageIcon className="w-4 h-4 mr-1" />
                            View
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                        <div className="truncate">
                          {sale.notes || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDeleteSale(sale.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title="Delete sale"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <AddSaleModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleAddSale}
        />
      </div>
    </Layout>
  );
};

export default SalesTracker;

