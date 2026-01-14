import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Inbox,
  Loader2,
  MessageSquare,
  RefreshCw,
  Sparkles,
  TrendingDown,
  Users,
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useOperationsAnalytics, ThreadWithLatestMessage, InactiveThread } from '../hooks/useOperationsAnalytics';
import { useAuth } from '../contexts/AuthContext';
import { StaggerContainer } from '../components/ui/StaggerContainer';
import { StaggeredItem } from '../components/ui/StaggeredItem';

const OperationsAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const { teamMember, isManagerOrAbove } = useAuth();
  const {
    unansweredThreads,
    inactiveThreads,
    stats,
    dailySummary,
    loading,
    error,
    generatingSummary,
    refetch,
    generateDailySummary,
    getTimeSinceLastMessage,
    INACTIVITY_THRESHOLDS,
  } = useOperationsAnalytics();

  const [showAllUnanswered, setShowAllUnanswered] = useState(false);
  const [showAllInactive, setShowAllInactive] = useState(false);
  const [activeInactivityTab, setActiveInactivityTab] = useState<'all' | 'warning' | 'attention' | 'critical'>('all');

  // Permission check
  const canView = isManagerOrAbove;

  // Generate summary on mount
  useEffect(() => {
    if (canView && !dailySummary && !generatingSummary) {
      generateDailySummary();
    }
  }, [canView, dailySummary, generatingSummary, generateDailySummary]);

  // Filter inactive threads by tier
  const filteredInactiveThreads = activeInactivityTab === 'all'
    ? inactiveThreads
    : inactiveThreads.filter(t => t.inactivity_tier === activeInactivityTab);

  // Navigate to thread
  const openThread = (threadId: number) => {
    navigate(`/chats?thread=${threadId}`);
  };

  // Get message preview
  const getMessagePreview = (thread: ThreadWithLatestMessage): string => {
    const msg = thread.latest_message;
    if (!msg) return 'No messages';
    const text = msg.text || msg.speech_text || '';
    return text.length > 80 ? text.substring(0, 80) + '...' : text;
  };

  // Get tier color classes
  const getTierColorClasses = (tier: 'warning' | 'attention' | 'critical') => {
    switch (tier) {
      case 'warning':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-800',
          text: 'text-yellow-700 dark:text-yellow-400',
          badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
        };
      case 'attention':
        return {
          bg: 'bg-orange-50 dark:bg-orange-900/20',
          border: 'border-orange-200 dark:border-orange-800',
          text: 'text-orange-700 dark:text-orange-400',
          badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
        };
      case 'critical':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-700 dark:text-red-400',
          badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        };
    }
  };

  if (!canView) {
    return (
      <Layout title="Operations Analytics">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <p className="text-sm text-red-800 dark:text-red-200">
            You don't have permission to access this page. This page is only available to managers and above.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Operations Analytics">
      <StaggerContainer className="space-y-6">
        {/* Header */}
        <StaggeredItem delay={0.1}>
          <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl p-6 lg:p-8 text-white shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex items-center mb-4 md:mb-0">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4 backdrop-blur-sm">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold">Operations Analytics</h1>
                  <p className="text-teal-100 text-sm lg:text-base">
                    Monitor client engagement and retention metrics
                  </p>
                </div>
              </div>

              <button
                onClick={() => refetch()}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-white/15 backdrop-blur-sm rounded-xl hover:bg-white/25 transition-all duration-200 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh Data
              </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
                <div className="text-teal-100 text-sm mb-1 flex items-center">
                  <Inbox className="w-4 h-4 mr-1" />
                  Total Threads
                </div>
                <div className="text-2xl font-bold">{stats.total_threads}</div>
              </div>
              <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
                <div className="text-teal-100 text-sm mb-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Unanswered
                </div>
                <div className="text-2xl font-bold text-yellow-300">{stats.unanswered_count}</div>
              </div>
              <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
                <div className="text-teal-100 text-sm mb-1 flex items-center">
                  <TrendingDown className="w-4 h-4 mr-1" />
                  Inactive (7d+)
                </div>
                <div className="text-2xl font-bold text-orange-300">
                  {stats.inactive_7_days + stats.inactive_14_days + stats.inactive_30_days}
                </div>
              </div>
              <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
                <div className="text-teal-100 text-sm mb-1 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Critical (30d+)
                </div>
                <div className="text-2xl font-bold text-red-300">{stats.inactive_30_days}</div>
              </div>
            </div>
          </div>
        </StaggeredItem>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
            <p className="text-sm text-red-800 dark:text-red-200">Error: {error}</p>
          </div>
        )}

        {/* AI Daily Summary */}
        <StaggeredItem delay={0.2}>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-purple-500 bg-opacity-20 rounded-lg flex items-center justify-center mr-3">
                    <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      AI Daily Summary
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Yesterday's messages analyzed by Grok
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => generateDailySummary(true)}
                  disabled={generatingSummary}
                  className="flex items-center px-3 py-1.5 text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50"
                >
                  {generatingSummary ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Bot className="w-4 h-4 mr-1" />
                  )}
                  {generatingSummary ? 'Generating...' : 'Regenerate'}
                </button>
              </div>
            </div>

            <div className="p-6">
              {dailySummary?.loading || generatingSummary ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                  <span className="ml-3 text-gray-600 dark:text-gray-400">
                    Analyzing yesterday's messages...
                  </span>
                </div>
              ) : dailySummary?.error ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">{dailySummary.error}</p>
                </div>
              ) : dailySummary ? (
                <div className="space-y-6">
                  {/* Summary */}
                  <div>
                    <div className="flex items-center mb-2">
                      <BarChart3 className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Summary ({dailySummary.message_count} messages)
                      </span>
                    </div>
                    <p className="text-gray-900 dark:text-white">{dailySummary.summary}</p>
                  </div>

                  {/* Action Items */}
                  {dailySummary.action_items.length > 0 && (
                    <div>
                      <div className="flex items-center mb-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Action Items
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {dailySummary.action_items.map((item, idx) => (
                          <li
                            key={idx}
                            className="flex items-start p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
                          >
                            <ArrowRight className="w-4 h-4 text-green-600 dark:text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-green-800 dark:text-green-200">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Noteworthy */}
                  {dailySummary.noteworthy.length > 0 && (
                    <div>
                      <div className="flex items-center mb-2">
                        <AlertCircle className="w-4 h-4 text-blue-500 mr-2" />
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Noteworthy
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {dailySummary.noteworthy.map((item, idx) => (
                          <li
                            key={idx}
                            className="flex items-start p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                          >
                            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-blue-800 dark:text-blue-200">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Bot className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Click "Regenerate" to analyze yesterday's messages
                  </p>
                </div>
              )}
            </div>
          </div>
        </StaggeredItem>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Unanswered Threads */}
          <StaggeredItem delay={0.3}>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden h-full">
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-yellow-500 bg-opacity-20 rounded-lg flex items-center justify-center mr-3">
                      <MessageSquare className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Unanswered Threads
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Clients waiting for a response
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-full text-sm font-medium">
                    {unansweredThreads.length}
                  </span>
                </div>
              </div>

              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <div className="p-6 text-center">
                    <Loader2 className="w-8 h-8 text-yellow-500 animate-spin mx-auto" />
                  </div>
                ) : unansweredThreads.length === 0 ? (
                  <div className="p-8 text-center">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">All threads are answered!</p>
                  </div>
                ) : (
                  <>
                    {(showAllUnanswered ? unansweredThreads : unansweredThreads.slice(0, 5)).map(
                      (thread) => (
                        <button
                          key={thread.id}
                          onClick={() => openThread(thread.id)}
                          className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center">
                                <span className="font-medium text-gray-900 dark:text-white truncate">
                                  {thread.name || `Thread #${thread.id}`}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                                {getMessagePreview(thread)}
                              </p>
                            </div>
                            <div className="flex items-center ml-4">
                              <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {getTimeSinceLastMessage(thread)}
                              </span>
                              <ExternalLink className="w-4 h-4 text-gray-400 ml-2" />
                            </div>
                          </div>
                        </button>
                      )
                    )}
                    {unansweredThreads.length > 5 && (
                      <button
                        onClick={() => setShowAllUnanswered(!showAllUnanswered)}
                        className="w-full p-4 text-center text-sm font-medium text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                      >
                        {showAllUnanswered ? (
                          <>
                            <ChevronUp className="w-4 h-4 inline mr-1" />
                            Show Less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4 inline mr-1" />
                            Show All ({unansweredThreads.length - 5} more)
                          </>
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </StaggeredItem>

          {/* Inactive Threads */}
          <StaggeredItem delay={0.4}>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden h-full">
              <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-orange-500 bg-opacity-20 rounded-lg flex items-center justify-center mr-3">
                      <TrendingDown className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Inactive Threads
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Retention check-ins needed
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 rounded-full text-sm font-medium">
                    {inactiveThreads.length}
                  </span>
                </div>
              </div>

              {/* Tier Tabs */}
              <div className="flex border-b border-gray-200 dark:border-gray-700">
                {(['all', 'warning', 'attention', 'critical'] as const).map((tab) => {
                  const count =
                    tab === 'all'
                      ? inactiveThreads.length
                      : inactiveThreads.filter((t) => t.inactivity_tier === tab).length;
                  const labels = {
                    all: 'All',
                    warning: `7-13d (${stats.inactive_7_days})`,
                    attention: `14-29d (${stats.inactive_14_days})`,
                    critical: `30d+ (${stats.inactive_30_days})`,
                  };
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveInactivityTab(tab)}
                      className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                        activeInactivityTab === tab
                          ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 dark:border-teal-400 bg-teal-50 dark:bg-teal-900/20'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      {labels[tab]}
                    </button>
                  );
                })}
              </div>

              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <div className="p-6 text-center">
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
                  </div>
                ) : filteredInactiveThreads.length === 0 ? (
                  <div className="p-8 text-center">
                    <Users className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">
                      {activeInactivityTab === 'all'
                        ? 'No inactive threads!'
                        : `No threads in this tier`}
                    </p>
                  </div>
                ) : (
                  <>
                    {(showAllInactive ? filteredInactiveThreads : filteredInactiveThreads.slice(0, 5)).map(
                      (thread) => {
                        const tierColors = getTierColorClasses(thread.inactivity_tier);
                        return (
                          <button
                            key={thread.id}
                            onClick={() => openThread(thread.id)}
                            className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center">
                                  <span className="font-medium text-gray-900 dark:text-white truncate">
                                    {thread.name || `Thread #${thread.id}`}
                                  </span>
                                  <span
                                    className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${tierColors.badge}`}
                                  >
                                    {thread.days_inactive}d inactive
                                  </span>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                                  {getMessagePreview(thread)}
                                </p>
                              </div>
                              <ExternalLink className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" />
                            </div>
                          </button>
                        );
                      }
                    )}
                    {filteredInactiveThreads.length > 5 && (
                      <button
                        onClick={() => setShowAllInactive(!showAllInactive)}
                        className="w-full p-4 text-center text-sm font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                      >
                        {showAllInactive ? (
                          <>
                            <ChevronUp className="w-4 h-4 inline mr-1" />
                            Show Less
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4 inline mr-1" />
                            Show All ({filteredInactiveThreads.length - 5} more)
                          </>
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </StaggeredItem>
        </div>

        {/* Retention Tips */}
        <StaggeredItem delay={0.5}>
          <div className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 rounded-xl border border-teal-200 dark:border-teal-800 p-6">
            <div className="flex items-start">
              <div className="w-10 h-10 bg-teal-500 bg-opacity-20 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                <Sparkles className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Retention Tips
                </h3>
                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-teal-500 rounded-full mr-2 mt-2 flex-shrink-0"></span>
                    <span>
                      <strong>7-day inactive:</strong> Send a friendly check-in message asking how
                      they're doing
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-teal-500 rounded-full mr-2 mt-2 flex-shrink-0"></span>
                    <span>
                      <strong>14-day inactive:</strong> Offer exclusive content or a special
                      promotion to re-engage
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-teal-500 rounded-full mr-2 mt-2 flex-shrink-0"></span>
                    <span>
                      <strong>30-day+ inactive:</strong> Consider reaching out via SMS or sending a
                      "we miss you" message
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </StaggeredItem>
      </StaggerContainer>
    </Layout>
  );
};

export default OperationsAnalytics;

