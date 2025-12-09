import React from 'react';
import { TrendingUp, Clock, CheckCircle, FileText, DollarSign, CreditCard, Users, AlertCircle, ChevronUp, ChevronDown, Cake } from 'lucide-react';
import Layout from '../components/layout/Layout';
import CustomDetailModal from '../components/modals/CustomDetailModal';
import { useCustomRequests } from '../hooks/useCustomRequests';
import { useClients } from '../hooks/useClients';
import { useUpcomingBirthdays } from '../hooks/useUpcomingBirthdays';
import ClientAvatar from '../components/ui/ClientAvatar';
import RealtimeDebugPanel from '../components/debug/RealtimeDebugPanel';


const Dashboard: React.FC = () => {
  const { customRequests, loading: customsLoading, error: customsError, fetchCustomRequests } = useCustomRequests();
  const { clients, loading: clientsLoading, error: clientsError } = useClients();
  const { upcomingBirthdays, loading: birthdaysLoading, error: birthdaysError } = useUpcomingBirthdays(15);
  const [sortField, setSortField] = React.useState<'client' | 'date' | 'amount' | null>(null);
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');
  const [selectedCustom, setSelectedCustom] = React.useState<any>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const loading = customsLoading || clientsLoading || birthdaysLoading;
  const error = customsError || clientsError || birthdaysError;

  // Calculate metrics
  const totalCustoms = customRequests.length;
  const pendingTeamApproval = customRequests.filter(c => c.status === 'pending').length;
  const pendingClientApproval = customRequests.filter(c => c.status === 'pending_client_approval').length;
  const inProgressCustoms = customRequests.filter(c => c.status === 'in_progress').length;
  const completedCustoms = customRequests.filter(c => c.status === 'completed').length;
  const deliveredCustoms = customRequests.filter(c => c.status === 'delivered').length;

  // Calculate payment metrics
  const totalPaidAmount = customRequests.reduce((sum, custom) => {
    return sum + (custom.amount_paid || 0);
  }, 0);

  const totalPendingAmount = customRequests
    .filter(c => c.status !== 'delivered' && c.status !== 'cancelled')
    .reduce((sum, custom) => {
      const proposed = custom.proposed_amount || 0;
      const paid = custom.amount_paid || 0;
      return sum + Math.max(0, proposed - paid);
    }, 0);

  // Organize stats into categories
  const workflowStats = [
    {
      name: 'Pending Team Approval',
      value: pendingTeamApproval,
      icon: AlertCircle,
      color: 'orange',
      description: 'Awaiting team review'
    },
    {
      name: 'Pending Client Approval', 
      value: pendingClientApproval,
      icon: Clock,
      color: 'blue',
      description: 'Awaiting client decision'
    },
    {
      name: 'In Progress',
      value: inProgressCustoms,
      icon: TrendingUp,
      color: 'yellow',
      description: 'Active work in progress'
    },
  ];

  const completionStats = [
    {
      name: 'Completed',
      value: completedCustoms,
      icon: CheckCircle,
      color: 'purple',
      description: 'Ready for delivery'
    },
    {
      name: 'Delivered',
      value: deliveredCustoms,
      icon: CheckCircle,
      color: 'green',
      description: 'Successfully delivered'
    },
  ];

  const financialStats = [
    {
      name: 'Total Paid',
      value: `$${totalPaidAmount.toFixed(2)}`,
      icon: DollarSign,
      color: 'green',
      description: 'Revenue received'
    },
    {
      name: 'Pending Revenue',
      value: `$${totalPendingAmount.toFixed(2)}`,
      icon: CreditCard,
      color: 'orange',
      description: 'Expected revenue'
    },
  ];

  const overviewStats = [
    {
      name: 'Total Clients',
      value: clients.length,
      icon: Users,
      color: 'blue',
      description: 'Active clients'
    },
    {
      name: 'Total Customs',
      value: totalCustoms,
      icon: FileText,
      color: 'gray',
      description: 'All custom requests'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-500 text-blue-600',
      yellow: 'bg-yellow-500 text-yellow-600',
      orange: 'bg-orange-500 text-orange-600',
      purple: 'bg-purple-500 text-purple-600',
      green: 'bg-green-500 text-green-600',
      gray: 'bg-gray-500 text-gray-600'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const recentCustoms = customRequests
    .sort((a, b) => new Date(b.date_submitted).getTime() - new Date(a.date_submitted).getTime())
    .slice(0, 5);

  const handleSort = (field: 'client' | 'date' | 'amount') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortedCustoms = (customs: typeof recentCustoms) => {
    if (!sortField) {
      return customs.sort((a, b) => new Date(b.date_submitted).getTime() - new Date(a.date_submitted).getTime());
    }

    return [...customs].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'client':
          aValue = (a as any).clients?.username || '';
          bValue = (b as any).clients?.username || '';
          break;
        case 'date':
          aValue = new Date(a.date_submitted).getTime();
          bValue = new Date(b.date_submitted).getTime();
          break;
        case 'amount':
          aValue = a.proposed_amount || 0;
          bValue = b.proposed_amount || 0;
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

  const SortButton: React.FC<{ field: 'client' | 'date' | 'amount'; children: React.ReactNode }> = ({ field, children }) => {
    const isActive = sortField === field;
    const isAsc = isActive && sortDirection === 'asc';
    
    return (
      <button
        onClick={() => handleSort(field)}
        className="flex items-center space-x-1 hover:text-gray-700 focus:outline-none"
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

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };

  const formatBirthdayMessage = (daysUntil: number) => {
    if (daysUntil === 0) return 'Today! 🎉';
    if (daysUntil === 1) return 'Tomorrow';
    return `In ${daysUntil} days`;
  };

  const formatBirthdayDate = (dateString: string) => {
    // Parse as UTC to avoid timezone issues
    const date = new Date(dateString + 'T00:00:00Z');
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });
  };

  const formatPaymentRatio = (amountPaid: number | null, proposedAmount: number | null) => {
    const paid = amountPaid || 0;
    const proposed = proposedAmount || 0;
    return `$${paid.toFixed(2)}/$${proposed.toFixed(2)}`;
  };

  const handleCustomClick = (custom: any) => {
    setSelectedCustom(custom);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCustom(null);
  };

  if (loading) {
    return (
      <Layout title="Dashboard">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Dashboard">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">Error loading dashboard: {error}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard">
      <div className="space-y-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {overviewStats.map((stat) => {
            const Icon = stat.icon;
            const colorClasses = getColorClasses(stat.color);
            
            return (
              <div key={stat.name} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{stat.name}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.description}</p>
                  </div>
                  <div className={`flex-shrink-0 w-14 h-14 flex items-center justify-center rounded-xl bg-opacity-10 ${colorClasses.split(' ')[0]}`}>
                    <Icon className={`w-7 h-7 ${colorClasses.split(' ')[1]}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Upcoming Birthdays */}
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-xl border border-pink-200 dark:border-pink-700 p-6 shadow-sm">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-pink-500 bg-opacity-20">
              <Cake className="w-6 h-6 text-pink-600 dark:text-pink-400" />
            </div>
            <div className="ml-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upcoming Birthdays</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {upcomingBirthdays.length > 0 
                  ? `${upcomingBirthdays.length} client${upcomingBirthdays.length !== 1 ? 's' : ''} with birthdays in the next 15 days`
                  : 'No upcoming birthdays in the next 15 days'
                }
              </p>
            </div>
          </div>
          {upcomingBirthdays.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {upcomingBirthdays.map((client) => (
                <div
                  key={client.id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center space-x-3">
                    <ClientAvatar
                      client={{ username: client.username, avatar_url: client.avatar_url }}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        @{client.username}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {formatBirthdayDate(client.date_of_birth)}
                      </p>
                      <p className={`text-xs font-medium mt-1 ${
                        client.days_until_birthday === 0
                          ? 'text-pink-600 dark:text-pink-400'
                          : client.days_until_birthday <= 3
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-purple-600 dark:text-purple-400'
                      }`}>
                        {formatBirthdayMessage(client.days_until_birthday)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Add birthday information to client profiles to see upcoming birthdays here.
              </p>
            </div>
          )}
        </div>

        {/* Workflow Status Cards */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Workflow Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {workflowStats.map((stat) => {
              const Icon = stat.icon;
              const colorClasses = getColorClasses(stat.color);
              
              return (
                <div key={stat.name} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg bg-opacity-20 ${colorClasses.split(' ')[0]}`}>
                      <Icon className={`w-6 h-6 ${colorClasses.split(' ')[1]}`} />
                    </div>
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.name}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Completion & Financial Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Completion Stats */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Completion Status</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {completionStats.map((stat) => {
                const Icon = stat.icon;
                const colorClasses = getColorClasses(stat.color);
                
                return (
                  <div key={stat.name} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-opacity-20 ${colorClasses.split(' ')[0]}`}>
                        <Icon className={`w-5 h-5 ${colorClasses.split(' ')[1]}`} />
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.name}</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Financial Stats */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Financial Overview</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {financialStats.map((stat) => {
                const Icon = stat.icon;
                const colorClasses = getColorClasses(stat.color);
                
                return (
                  <div key={stat.name} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-opacity-20 ${colorClasses.split(' ')[0]}`}>
                        <Icon className={`w-5 h-5 ${colorClasses.split(' ')[1]}`} />
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.name}</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Custom Requests</h2>
          </div>
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <SortButton field="client">Client</SortButton>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Fan Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <SortButton field="date">Date Submitted</SortButton>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <SortButton field="amount">Payment Status</SortButton>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {getSortedCustoms(recentCustoms).map((custom) => (
                  <tr key={custom.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onClick={() => handleCustomClick(custom)}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {(custom as any).clients?.username ? (
                        <span className="text-blue-600 font-medium">
                          @{(custom as any).clients.username}
                        </span>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">Unknown Client</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      <div className="flex items-center">
                        {custom.fan_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(custom.date_submitted)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatPaymentRatio(custom.amount_paid, custom.proposed_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        custom.status === 'pending_team_approval' ? 'bg-orange-100 text-orange-800' :
                        custom.status === 'pending_client_approval' ? 'bg-blue-100 text-blue-800' :
                        custom.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                        custom.status === 'completed' ? 'bg-purple-100 text-purple-800' :
                        custom.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {custom.status === 'pending_team_approval' ? 'Pending Team' :
                         custom.status === 'pending_client_approval' ? 'Pending Client' :
                         custom.status === 'in_progress' ? 'In Progress' :
                         custom.status === 'completed' ? 'Completed' :
                         custom.status === 'delivered' ? 'Delivered' :
                         custom.status.charAt(0).toUpperCase() + custom.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <CustomDetailModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          custom={selectedCustom}
          onUpdate={fetchCustomRequests}
        />
      </div>
    </Layout>
  );
};

export default Dashboard;