import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, Calendar, Plus, Edit2, Users, Award, Filter, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import Layout from '../components/layout/Layout';
import AddBonusModal from '../components/modals/AddBonusModal';
import EditPayrollSettingsModal from '../components/modals/EditPayrollSettingsModal';
import ModernSelect from '../components/ui/ModernSelect';
import { usePayroll } from '../hooks/usePayroll';
import { usePermissions } from '../hooks/usePermissions';
import { StaggerContainer } from '../components/ui/StaggerContainer';

// Calculate net from gross (gross - 20% platform fee)
const calculateNet = (gross: number) => gross * 0.8;

const PayrollSheet: React.FC = () => {
  const { hasPermission } = usePermissions();
  const { payrollData, loading, error, fetchPayrollData, updatePayrollSettings, addBonus, deleteBonus } = usePayroll();
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [sortColumn, setSortColumn] = useState<'netSales' | 'totalPay' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [addBonusModalOpen, setAddBonusModalOpen] = useState(false);
  const [editSettingsModalOpen, setEditSettingsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [expandedBonuses, setExpandedBonuses] = useState<Set<string>>(new Set());

  const canViewPayroll = hasPermission('sales.payroll');

  useEffect(() => {
    if (canViewPayroll) {
      fetchPayrollData(selectedMonth, selectedYear);
    }
  }, [selectedMonth, selectedYear, canViewPayroll]);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthOptions = months.map((month, index) => ({
    value: index + 1,
    label: month,
  }));

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
  
  const yearOptions = years.map((year) => ({
    value: year,
    label: year.toString(),
  }));

  // Navigation functions for month arrows
  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  // Get unique roles from payroll data for filter
  const roleOptions = useMemo(() => {
    const roles = [...new Set(payrollData.map(m => m.role))].sort();
    return [
      { value: 'all', label: 'All Roles' },
      ...roles.map(role => ({
        value: role,
        label: role.charAt(0).toUpperCase() + role.slice(1),
      })),
    ];
  }, [payrollData]);

  // Filter payroll data by selected role
  const filteredPayrollData = useMemo(() => {
    let data = selectedRole === 'all' ? payrollData : payrollData.filter(member => member.role === selectedRole);
    
    // Apply sorting if a sort column is selected
    if (sortColumn) {
      data = [...data].sort((a, b) => {
        let aValue: number;
        let bValue: number;
        
        if (sortColumn === 'netSales') {
          aValue = calculateNet(a.total_valid_sales);
          bValue = calculateNet(b.total_valid_sales);
        } else {
          // totalPay
          const aNetSales = calculateNet(a.total_valid_sales);
          const bNetSales = calculateNet(b.total_valid_sales);
          
          let aBaseSalary = a.payroll_settings?.base_salary || 0;
          if (aBaseSalary === 0 && a.role === 'chatter') {
            aBaseSalary = aNetSales >= 8000 ? 450 : 250;
          }
          let bBaseSalary = b.payroll_settings?.base_salary || 0;
          if (bBaseSalary === 0 && b.role === 'chatter') {
            bBaseSalary = bNetSales >= 8000 ? 450 : 250;
          }
          
          const aCommissionRate = (a.payroll_settings?.commission_percentage || 2.5) / 100;
          const bCommissionRate = (b.payroll_settings?.commission_percentage || 2.5) / 100;
          
          const aCommission = aNetSales * aCommissionRate;
          const bCommission = bNetSales * bCommissionRate;
          
          const aBonusTotal = a.bonuses.reduce((sum, bon) => sum + Number(bon.amount), 0);
          const bBonusTotal = b.bonuses.reduce((sum, bon) => sum + Number(bon.amount), 0);
          
          aValue = aBaseSalary + aCommission + aBonusTotal;
          bValue = bBaseSalary + bCommission + bBonusTotal;
        }
        
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      });
    }
    
    return data;
  }, [payrollData, selectedRole, sortColumn, sortDirection]);

  // Handle sort column click
  const handleSort = (column: 'netSales' | 'totalPay') => {
    if (sortColumn === column) {
      // Toggle direction or clear sort
      if (sortDirection === 'desc') {
        setSortDirection('asc');
      } else {
        setSortColumn(null);
        setSortDirection('desc');
      }
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Get sort icon for a column
  const getSortIcon = (column: 'netSales' | 'totalPay') => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />;
    }
    return sortDirection === 'desc' 
      ? <ArrowDown className="w-3 h-3 ml-1" />
      : <ArrowUp className="w-3 h-3 ml-1" />;
  };

  // Calculate totals based on filtered data (using NET sales)
  // NOTE: This must be called before any conditional returns to follow Rules of Hooks
  const totals = useMemo(() => {
    return filteredPayrollData.reduce((acc, member) => {
      // Calculate net sales (gross - 20%)
      const netSales = calculateNet(member.total_valid_sales);
      
      // Auto-calculate base salary for chatters if not set (based on net sales)
      let baseSalary = member.payroll_settings?.base_salary || 0;
      if (baseSalary === 0 && member.role === 'chatter') {
        baseSalary = netSales >= 8000 ? 450 : 250; // Adjusted threshold for net (was 10000 gross)
      }
      
      // Commission is calculated on NET sales
      const commissionRate = (member.payroll_settings?.commission_percentage || 2.5) / 100;
      const commission = netSales * commissionRate;
      const bonusTotal = member.bonuses.reduce((sum, b) => sum + Number(b.amount), 0);
      const total = baseSalary + commission + bonusTotal;

      return {
        baseSalary: acc.baseSalary + baseSalary,
        commission: acc.commission + commission,
        bonuses: acc.bonuses + bonusTotal,
        netSales: acc.netSales + netSales,
        total: acc.total + total,
      };
    }, {
      baseSalary: 0,
      commission: 0,
      bonuses: 0,
      netSales: 0,
      total: 0,
    });
  }, [filteredPayrollData]);

  // Check if user has permission to view payroll
  // NOTE: This must be AFTER all hooks are called
  if (!canViewPayroll) {
    return (
      <Layout title="Payroll Sheet">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <p className="text-sm text-red-800 dark:text-red-200">
            You don't have permission to access this page. Contact your administrator to request payroll access.
          </p>
        </div>
      </Layout>
    );
  }

  const handleEditSettings = (member: any) => {
    setSelectedMember(member);
    setEditSettingsModalOpen(true);
  };

  const handleSaveSettings = async (baseSalary: number, commissionPercentage: number) => {
    if (!selectedMember) return { error: 'No member selected' };
    const result = await updatePayrollSettings(selectedMember.id, baseSalary, commissionPercentage);
    if (!result.error) {
      setEditSettingsModalOpen(false);
      setSelectedMember(null);
    }
    return result;
  };

  const handleAddBonus = async (memberIds: string[], amount: number, reason: string, bonusDate: string) => {
    const result = await addBonus(memberIds, amount, reason, bonusDate);
    if (!result.error) {
      setAddBonusModalOpen(false);
    }
    return result;
  };

  const toggleBonusesExpanded = (memberId: string) => {
    const newExpanded = new Set(expandedBonuses);
    if (newExpanded.has(memberId)) {
      newExpanded.delete(memberId);
    } else {
      newExpanded.add(memberId);
    }
    setExpandedBonuses(newExpanded);
  };

  // Helper component for displaying values with loading state
  const DataValue: React.FC<{ value: string; className?: string }> = ({ value, className = '' }) => (
    <span className={`transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'} ${className}`}>
      {value}
    </span>
  );

  return (
    <Layout title="Payroll Sheet">
      <StaggerContainer className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 lg:p-8 text-white shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4 backdrop-blur-sm">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold">Payroll Sheet</h1>
                <p className="text-green-100 text-sm lg:text-base">Manage team salaries, commissions, and bonuses</p>
              </div>
            </div>

            {/* Month/Year Selector with Navigation Arrows */}
            <div className="flex items-center space-x-2">
              {/* Previous Month Button */}
              <button
                onClick={goToPreviousMonth}
                className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center hover:bg-white/25 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                title="Previous month"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
              <ModernSelect
                value={selectedMonth}
                onChange={(value) => setSelectedMonth(Number(value))}
                options={monthOptions}
                className="w-40"
              />
              <ModernSelect
                value={selectedYear}
                onChange={(value) => setSelectedYear(Number(value))}
                options={yearOptions}
                className="w-28"
              />

              {/* Next Month Button */}
              <button
                onClick={goToNextMonth}
                className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center hover:bg-white/25 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                title="Next month"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="text-green-100 text-sm mb-1 flex items-center">
                Total Payroll
                {loading && <span className="ml-2 w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              </div>
              <div className="text-2xl font-bold">
                <DataValue value={`$${totals.total.toFixed(2)}`} />
              </div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="text-green-100 text-sm mb-1">Base Salaries</div>
              <div className="text-2xl font-bold">
                <DataValue value={`$${totals.baseSalary.toFixed(2)}`} />
              </div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="text-green-100 text-sm mb-1">Commissions</div>
              <div className="text-2xl font-bold">
                <DataValue value={`$${totals.commission.toFixed(2)}`} />
              </div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="text-green-100 text-sm mb-1">Bonuses</div>
              <div className="text-2xl font-bold">
                <DataValue value={`$${totals.bonuses.toFixed(2)}`} />
              </div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="text-green-100 text-sm mb-1">Net Sales</div>
              <div className="text-2xl font-bold">
                <DataValue value={`$${totals.netSales.toFixed(2)}`} />
              </div>
            </div>
          </div>
        </div>

        {/* Error Display (inline, not replacing UI) */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
            <p className="text-sm text-red-800 dark:text-red-200">Error loading payroll: {error}</p>
          </div>
        )}

        {/* Filters & Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 shadow-lg">
          {/* Role Filter */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center text-sm font-medium text-white">
              <Filter className="w-5 h-5 mr-2" />
              <span>Filter by Role:</span>
            </div>
            <ModernSelect
              value={selectedRole}
              onChange={(value) => setSelectedRole(String(value))}
              options={roleOptions}
              className="w-44"
            />
            {selectedRole !== 'all' && (
              <span className="text-sm font-medium text-white/90 bg-white/20 px-2 py-1 rounded-lg">
                {filteredPayrollData.length} of {payrollData.length}
              </span>
            )}
          </div>

          {/* Add Bonus Button */}
          <button
            onClick={() => setAddBonusModalOpen(true)}
            className="flex items-center px-4 py-2 bg-white text-green-700 font-medium rounded-lg hover:bg-green-50 transition-colors shadow-md"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Bonus
          </button>
        </div>

        {/* Payroll Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Base Salary
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Commission %
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button 
                      onClick={() => handleSort('netSales')}
                      className={`inline-flex items-center justify-end w-full hover:text-gray-700 dark:hover:text-gray-200 transition-colors ${sortColumn === 'netSales' ? 'text-green-600 dark:text-green-400' : ''}`}
                    >
                      Net Sales
                      {getSortIcon('netSales')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Commission
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Bonuses
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button 
                      onClick={() => handleSort('totalPay')}
                      className={`inline-flex items-center justify-end w-full hover:text-gray-700 dark:hover:text-gray-200 transition-colors ${sortColumn === 'totalPay' ? 'text-green-600 dark:text-green-400' : ''}`}
                    >
                      Total Pay
                      {getSortIcon('totalPay')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className={`bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                {filteredPayrollData.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>{selectedRole === 'all' ? 'No team members found' : `No ${selectedRole}s found`}</p>
                    </td>
                  </tr>
                ) : filteredPayrollData.length === 0 && loading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                      <p>Loading data...</p>
                    </td>
                  </tr>
                ) : (
                  filteredPayrollData.map((member) => {
                    // Calculate net sales (gross - 20%)
                    const netSales = calculateNet(member.total_valid_sales);
                    
                    // Auto-calculate base salary for chatters if not set (based on net sales)
                    let baseSalary = member.payroll_settings?.base_salary || 0;
                    if (baseSalary === 0 && member.role === 'chatter') {
                      baseSalary = netSales >= 8000 ? 450 : 250; // Adjusted threshold for net
                    }
                    
                    // Commission is calculated on NET sales
                    const commissionRate = (member.payroll_settings?.commission_percentage || 2.5) / 100;
                    const commission = netSales * commissionRate;
                    const bonusTotal = member.bonuses.reduce((sum, b) => sum + Number(b.amount), 0);
                    const totalPay = baseSalary + commission + bonusTotal;
                    const isBonusExpanded = expandedBonuses.has(member.id);

                    return (
                      <React.Fragment key={member.id}>
                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {member.full_name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {member.email}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              member.role === 'owner' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                              member.role === 'admin' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                              member.role === 'manager' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                              'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                            }`}>
                              {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                            <div className="flex flex-col items-end">
                              <span>${baseSalary.toFixed(2)}</span>
                              {member.role === 'chatter' && !member.payroll_settings?.base_salary && (
                                <span className="text-xs text-blue-600 dark:text-blue-400">auto</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                            <div className="flex flex-col items-end">
                              <span>{(member.payroll_settings?.commission_percentage || 2.5).toFixed(2)}%</span>
                              {!member.payroll_settings?.commission_percentage && (
                                <span className="text-xs text-blue-600 dark:text-blue-400">default</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                            ${netSales.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600 dark:text-green-400">
                            ${commission.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            {member.bonuses.length > 0 ? (
                              <button
                                onClick={() => toggleBonusesExpanded(member.id)}
                                className="text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                ${bonusTotal.toFixed(2)} ({member.bonuses.length})
                              </button>
                            ) : (
                              <span className="text-gray-500 dark:text-gray-400">$0.00</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900 dark:text-white">
                            ${totalPay.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                            <button
                              onClick={() => handleEditSettings(member)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                              title="Edit salary settings"
                            >
                              <Edit2 className="w-4 h-4 inline" />
                            </button>
                          </td>
                        </tr>
                        {isBonusExpanded && member.bonuses.length > 0 && (
                          <tr className="bg-blue-50 dark:bg-blue-900/10">
                            <td colSpan={9} className="px-6 py-4">
                              <div className="space-y-2">
                                <div className="flex items-center text-sm font-medium text-gray-900 dark:text-white mb-2">
                                  <Award className="w-4 h-4 mr-2" />
                                  Bonuses for {member.full_name}
                                </div>
                                {member.bonuses.map((bonus) => (
                                  <div key={bonus.id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                                    <div className="flex-1">
                                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                                        {bonus.reason}
                                      </div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {new Date(bonus.bonus_date).toLocaleDateString()} • Added by {bonus.created_by_member?.full_name || 'Unknown'}
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                      <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                        ${Number(bonus.amount).toFixed(2)}
                                      </span>
                                      <button
                                        onClick={() => {
                                          if (confirm('Are you sure you want to delete this bonus?')) {
                                            deleteBonus(bonus.id);
                                          }
                                        }}
                                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                                        title="Delete bonus"
                                      >
                                        <span className="text-xs">Remove</span>
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
              {filteredPayrollData.length > 0 && (
                <tfoot className="bg-gray-100 dark:bg-gray-900">
                  <tr>
                    <td colSpan={2} className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">
                      {selectedRole === 'all' ? 'TOTALS' : `TOTALS (${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}s)`}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-gray-900 dark:text-white">
                      ${totals.baseSalary.toFixed(2)}
                    </td>
                    <td className="px-6 py-4"></td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-gray-900 dark:text-white">
                      ${totals.netSales.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-green-600 dark:text-green-400">
                      ${totals.commission.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-gray-900 dark:text-white">
                      ${totals.bonuses.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-gray-900 dark:text-white">
                      ${totals.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </StaggerContainer>

      <AddBonusModal
        isOpen={addBonusModalOpen}
        onClose={() => setAddBonusModalOpen(false)}
        onSubmit={handleAddBonus}
        teamMembers={payrollData}
      />

      <EditPayrollSettingsModal
        isOpen={editSettingsModalOpen}
        onClose={() => {
          setEditSettingsModalOpen(false);
          setSelectedMember(null);
        }}
        member={selectedMember}
        onSubmit={handleSaveSettings}
      />
    </Layout>
  );
};

export default PayrollSheet;

