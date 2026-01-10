import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, Calendar, Plus, Edit2, Users, Award } from 'lucide-react';
import Layout from '../components/layout/Layout';
import AddBonusModal from '../components/modals/AddBonusModal';
import EditPayrollSettingsModal from '../components/modals/EditPayrollSettingsModal';
import ModernSelect from '../components/ui/ModernSelect';
import { usePayroll } from '../hooks/usePayroll';
import { useAuth } from '../contexts/AuthContext';
import { StaggerContainer } from '../components/ui/StaggerContainer';

const PayrollSheet: React.FC = () => {
  const { teamMember } = useAuth();
  const { payrollData, loading, error, fetchPayrollData, updatePayrollSettings, addBonus, deleteBonus } = usePayroll();
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [addBonusModalOpen, setAddBonusModalOpen] = useState(false);
  const [editSettingsModalOpen, setEditSettingsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [expandedBonuses, setExpandedBonuses] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (teamMember?.role === 'admin' || teamMember?.role === 'owner') {
      fetchPayrollData(selectedMonth, selectedYear);
    }
  }, [selectedMonth, selectedYear, teamMember]);

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

  // Only admins can view this page
  if (teamMember?.role !== 'admin') {
    return (
      <Layout title="Payroll Sheet">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <p className="text-sm text-red-800 dark:text-red-200">
            You don't have permission to access this page. Only admins can view payroll information.
          </p>
        </div>
      </Layout>
    );
  }

  // Calculate totals
  const totals = useMemo(() => {
    return payrollData.reduce((acc, member) => {
      // Auto-calculate base salary for chatters if not set
      let baseSalary = member.payroll_settings?.base_salary || 0;
      if (baseSalary === 0 && member.role === 'chatter') {
        baseSalary = member.total_valid_sales >= 10000 ? 450 : 250;
      }
      
      const commissionRate = (member.payroll_settings?.commission_percentage || 2.5) / 100;
      const commission = member.total_valid_sales * commissionRate;
      const bonusTotal = member.bonuses.reduce((sum, b) => sum + Number(b.amount), 0);
      const total = baseSalary + commission + bonusTotal;

      return {
        baseSalary: acc.baseSalary + baseSalary,
        commission: acc.commission + commission,
        bonuses: acc.bonuses + bonusTotal,
        totalSales: acc.totalSales + member.total_valid_sales,
        total: acc.total + total,
      };
    }, {
      baseSalary: 0,
      commission: 0,
      bonuses: 0,
      totalSales: 0,
      total: 0,
    });
  }, [payrollData]);

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

  if (loading) {
    return (
      <Layout title="Payroll Sheet">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading payroll data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Payroll Sheet">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <p className="text-sm text-red-800 dark:text-red-200">Error loading payroll: {error}</p>
        </div>
      </Layout>
    );
  }

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

            {/* Month/Year Selector */}
            <div className="flex items-center space-x-3">
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
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="text-green-100 text-sm mb-1">Total Payroll</div>
              <div className="text-2xl font-bold">${totals.total.toFixed(2)}</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="text-green-100 text-sm mb-1">Base Salaries</div>
              <div className="text-2xl font-bold">${totals.baseSalary.toFixed(2)}</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="text-green-100 text-sm mb-1">Commissions</div>
              <div className="text-2xl font-bold">${totals.commission.toFixed(2)}</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="text-green-100 text-sm mb-1">Bonuses</div>
              <div className="text-2xl font-bold">${totals.bonuses.toFixed(2)}</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
              <div className="text-green-100 text-sm mb-1">Total Sales</div>
              <div className="text-2xl font-bold">${totals.totalSales.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end">
          <button
            onClick={() => setAddBonusModalOpen(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
                    Valid Sales
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Commission
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Bonuses
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Total Pay
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {payrollData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No team members found</p>
                    </td>
                  </tr>
                ) : (
                  payrollData.map((member) => {
                    // Auto-calculate base salary for chatters if not set
                    let baseSalary = member.payroll_settings?.base_salary || 0;
                    if (baseSalary === 0 && member.role === 'chatter') {
                      baseSalary = member.total_valid_sales >= 10000 ? 450 : 250;
                    }
                    
                    const commissionRate = (member.payroll_settings?.commission_percentage || 2.5) / 100;
                    const commission = member.total_valid_sales * commissionRate;
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
                            ${member.total_valid_sales.toFixed(2)}
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
              {payrollData.length > 0 && (
                <tfoot className="bg-gray-100 dark:bg-gray-900">
                  <tr>
                    <td colSpan={2} className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">
                      TOTALS
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-gray-900 dark:text-white">
                      ${totals.baseSalary.toFixed(2)}
                    </td>
                    <td className="px-6 py-4"></td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-gray-900 dark:text-white">
                      ${totals.totalSales.toFixed(2)}
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

