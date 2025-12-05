import React, { useState, useMemo } from 'react';
import { Clock, CheckCircle, XCircle, Calendar, DollarSign, User, Image as ImageIcon, Search, Filter } from 'lucide-react';
import Layout from '../components/layout/Layout';
import SaleApprovalModal from '../components/modals/SaleApprovalModal';
import { useSales } from '../hooks/useSales';

const PendingSalesApproval: React.FC = () => {
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [chatterFilter, setChatterFilter] = useState<string>('all');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const { sales, loading, error, approveSale, updateSale } = useSales();
  
  // Calculate net revenue (gross - 20%)
  const calculateNet = (gross: number) => gross * 0.8;
  
  // Helper to format date without timezone issues
  const formatLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('T')[0].split('-');
    return `${month}/${day}/${year}`;
  };

  // Filter to show only pending sales
  const pendingSales = useMemo(() => {
    return sales.filter(sale => sale.status === 'pending');
  }, [sales]);

  // Get unique chatters and shifts
  const chatters = useMemo(() => {
    const uniqueChatters = new Map();
    sales.forEach(sale => {
      if (sale.chatter) {
        uniqueChatters.set(sale.chatter.id, sale.chatter);
      }
    });
    return Array.from(uniqueChatters.values());
  }, [sales]);

  const shifts = useMemo(() => {
    const uniqueShifts = new Set<string>();
    sales.forEach(sale => {
      if (sale.chatter?.shift) {
        uniqueShifts.add(sale.chatter.shift);
      }
    });
    return Array.from(uniqueShifts).sort();
  }, [sales]);

  // Apply filters
  const filteredSales = useMemo(() => {
    return pendingSales.filter(sale => {
      const matchesSearch = searchTerm === '' ||
        sale.chatter?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.clients?.username?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesChatter = chatterFilter === 'all' || sale.chatter_id === chatterFilter;
      
      const matchesShift = shiftFilter === 'all' || sale.chatter?.shift === shiftFilter;

      return matchesSearch && matchesChatter && matchesShift;
    });
  }, [pendingSales, searchTerm, chatterFilter, shiftFilter]);

  // Sort by date (oldest first - FIFO)
  const sortedSales = useMemo(() => {
    return [...filteredSales].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [filteredSales]);

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
      <Layout title="Pending Sales Approval">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading pending sales...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Pending Sales Approval">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <p className="text-sm text-red-800 dark:text-red-200">Error loading sales: {error}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Pending Sales Approval">
      <div className="space-y-6">
        {/* Header with Stats */}
        <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl p-6 lg:p-8 text-white shadow-2xl">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4 backdrop-blur-sm">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">Pending Approvals</h1>
              <p className="text-yellow-100 text-sm lg:text-base">Review and approve chatter sales</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-yellow-100 text-sm">Pending</span>
                <Clock className="w-5 h-5 text-yellow-100" />
              </div>
              <div className="text-3xl font-bold">{pendingSales.length}</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-yellow-100 text-sm">Net Value</span>
                <DollarSign className="w-5 h-5 text-yellow-100" />
              </div>
              <div className="text-3xl font-bold">
                ${pendingSales.reduce((sum, s) => sum + calculateNet(s.gross_amount), 0).toFixed(0)}
              </div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-yellow-100 text-sm">Avg Net</span>
                <DollarSign className="w-5 h-5 text-yellow-100" />
              </div>
              <div className="text-3xl font-bold">
                ${pendingSales.length > 0 ? (pendingSales.reduce((sum, s) => sum + calculateNet(s.gross_amount), 0) / pendingSales.length).toFixed(0) : '0'}
              </div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-yellow-100 text-sm">Oldest</span>
                <Calendar className="w-5 h-5 text-yellow-100" />
              </div>
              <div className="text-sm font-bold">
                {pendingSales.length > 0 && sortedSales.length > 0
                  ? `${Math.floor((Date.now() - new Date(sortedSales[0].created_at).getTime()) / (1000 * 60 * 60 * 24))} days`
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by chatter or model..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <div>
              <select
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value)}
                className="w-full sm:w-40 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Shifts</option>
                {shifts.map((shift) => (
                  <option key={shift} value={shift}>
                    {shift}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={chatterFilter}
                onChange={(e) => setChatterFilter(e.target.value)}
                className="w-full sm:w-48 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Chatters</option>
                {chatters.map((chatter: any) => (
                  <option key={chatter.id} value={chatter.id}>
                    {chatter.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Sales List */}
        {sortedSales.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            {pendingSales.length === 0 ? (
              <>
                <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">All caught up!</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  There are no pending sales to review at this time.
                </p>
              </>
            ) : (
              <>
                <Search className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No matching sales</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Try adjusting your search or filters.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {sortedSales.map((sale) => (
              <div
                key={sale.id}
                onClick={() => handleSaleClick(sale)}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-pointer shadow-sm hover:shadow-md"
              >
                <div className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {sale.chatter?.full_name || 'Unknown'}
                        </span>
                      </div>
                      {sale.chatter?.shift && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                          {sale.chatter.shift} shift
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {Math.floor((Date.now() - new Date(sale.created_at).getTime()) / (1000 * 60 * 60 * 24))}d ago
                    </span>
                  </div>

                  {/* Model */}
                  <div className="flex items-center space-x-2">
                    {sale.clients?.avatar_url ? (
                      <img
                        src={sale.clients.avatar_url}
                        alt={sale.clients.username}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                        {sale.clients?.username?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                      @{sale.clients?.username || 'Unknown'}
                    </span>
                  </div>

                  {/* Amount */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="w-5 h-5 text-green-500" />
                        <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                          ${calculateNet(sale.gross_amount).toFixed(2)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-7">
                        Net (${sale.gross_amount.toFixed(2)} gross)
                      </span>
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatLocalDate(sale.sale_date)}</span>
                    </div>
                    {sale.sale_time && (
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{sale.sale_time}</span>
                      </div>
                    )}
                  </div>

                  {/* Screenshot indicator */}
                  {sale.screenshot_url && (
                    <div className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400">
                      <ImageIcon className="w-4 h-4" />
                      <span>Has screenshot</span>
                    </div>
                  )}

                  {/* Action hint */}
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                      Click to review and approve
                    </p>
                  </div>
                </div>
              </div>
            ))}
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

export default PendingSalesApproval;

