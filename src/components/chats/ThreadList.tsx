import React, { useState, useMemo } from 'react';
import { MessageSquare, Search, RefreshCw, Settings, AlertTriangle, Volume2, VolumeX, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Thread {
  id: number;
  group_id: string;
  name: string | null;
  client_id: string | null;
  participants: string[];
  created_at: string;
  updated_at: string;
  latest_message?: {
    text: string;
    created_at: string;
    sender_name: string;
    sender_phone_number: string;
  };
  unread_count?: number;
  last_read_at?: string;
}

interface ThreadListProps {
  threads: Thread[];
  selectedThread: Thread | null;
  loading: boolean;
  refreshing: boolean;
  searchQuery: string;
  contactMap: Record<string, string>;
  onThreadSelect: (thread: Thread) => void;
  onRefresh: () => void;
  onSearchChange: (query: string) => void;
  onMarkAsRead: (threadId: number) => void;
  onShowManagement?: () => void;
  soundEnabled?: boolean;
  onSoundToggle?: () => void;
  hasMoreThreads?: boolean;
  loadingMoreThreads?: boolean;
  onLoadMoreThreads?: () => void;
}

// Generate a consistent gradient based on thread name/id
const getAvatarGradient = (name: string | null, id: number): string => {
  const gradients = [
    'from-blue-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-violet-500 to-purple-600',
    'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-cyan-500 to-blue-600',
    'from-fuchsia-500 to-pink-600',
    'from-lime-500 to-green-600',
  ];
  const index = (name?.charCodeAt(0) || id) % gradients.length;
  return gradients[index];
};

// Get initials from thread name
const getInitials = (name: string | null): string => {
  if (!name) return '?';
  const cleaned = name.replace('@', '').trim();
  const words = cleaned.split(/[\s-]+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return cleaned.substring(0, 2).toUpperCase();
};

export function ThreadList({
  threads,
  selectedThread,
  loading,
  refreshing,
  searchQuery,
  contactMap,
  onThreadSelect,
  onRefresh,
  onSearchChange,
  onMarkAsRead,
  onShowManagement,
  soundEnabled = true,
  onSoundToggle,
  hasMoreThreads = false,
  loadingMoreThreads = false,
  onLoadMoreThreads
}: ThreadListProps) {
  const [filterType, setFilterType] = useState<'all' | 'unread'>('all');
  const [sortOrder, setSortOrder] = useState<'recent' | 'oldest'>('recent');

  const getDisplayName = (phone: string) => {
    return contactMap[phone] || phone;
  };

  const customFormatDate = (date: string | null) => {
    if (!date) return '';
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch (err) {
      return '';
    }
  };

  const handleThreadSelect = (thread: Thread) => {
    onThreadSelect(thread);
    onMarkAsRead(thread.id);
  };

  const isUnread = (thread: Thread) => {
    if (!thread.latest_message) return false;
    if (!thread.last_read_at) return true;
    try {
      const lastMessageTime = new Date(thread.latest_message.created_at);
      const lastReadTime = new Date(thread.last_read_at);
      return lastMessageTime > lastReadTime;
    } catch {
      return false;
    }
  };

  const filteredAndSortedThreads = useMemo(() => {
    let result = [...threads];
    if (filterType === 'unread') {
      result = result.filter(thread => isUnread(thread));
    }
    result.sort((a, b) => {
      const aTime = a.latest_message?.created_at || a.updated_at;
      const bTime = b.latest_message?.created_at || b.updated_at;
      if (!aTime || !bTime) return 0;
      const aDate = new Date(aTime).getTime();
      const bDate = new Date(bTime).getTime();
      return sortOrder === 'recent' ? bDate - aDate : aDate - bDate;
    });
    return result;
  }, [threads, filterType, sortOrder]);

  // Count unread threads
  const unreadCount = useMemo(() => {
    return threads.filter(t => isUnread(t)).length;
  }, [threads]);

  return (
    <div className="w-80 bg-white flex-shrink-0 flex flex-col h-full border-r border-slate-200">
      {/* Header Section */}
      <div className="p-4 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
        {/* Title Row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Client Chats</h1>
            {onSoundToggle && (
              <button
                onClick={onSoundToggle}
                className={`p-1.5 rounded-full transition-all duration-200 ${
                  soundEnabled 
                    ? 'bg-blue-100 text-blue-600 hover:bg-blue-200 shadow-sm' 
                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                }`}
                title={soundEnabled ? 'Sound on' : 'Sound off'}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all duration-200 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Management Button */}
        <button
          onClick={onShowManagement}
          className="w-full flex items-center justify-between p-3 mb-4 rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 text-white shadow-md hover:shadow-lg hover:from-slate-700 hover:to-slate-600 transition-all duration-200 group"
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-white/20 rounded-lg">
              <Settings className="w-4 h-4" />
            </div>
            <span className="font-medium text-sm">Management</span>
          </div>
          <ChevronRight className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
        </button>

        {/* Search Input */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search chats..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-0 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white transition-all duration-200"
          />
        </div>

        {/* Filter & Sort Controls - Modern Segmented Style */}
        <div className="flex gap-2">
          {/* Filter Toggle */}
          <div className="flex-1 flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setFilterType('all')}
              className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
                filterType === 'all'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('unread')}
              className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 flex items-center justify-center gap-1 ${
                filterType === 'unread'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Unread
              {unreadCount > 0 && (
                <span className={`min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full ${
                  filterType === 'unread' ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-600'
                }`}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Sort Toggle */}
          <button
            onClick={() => setSortOrder(sortOrder === 'recent' ? 'oldest' : 'recent')}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-600 rounded-lg transition-all duration-200"
          >
            {sortOrder === 'recent' ? 'Recent First' : 'Oldest First'}
          </button>
        </div>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-10 h-10 border-3 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-3"></div>
            <p className="text-sm text-slate-500">Loading threads...</p>
          </div>
        ) : filteredAndSortedThreads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700 mb-1">No threads found</h3>
            <p className="text-xs text-slate-500">
              {searchQuery ? 'Try adjusting your search' : filterType === 'unread' ? 'All caught up!' : 'No conversations yet'}
            </p>
          </div>
        ) : (
          <div className="py-2">
            {filteredAndSortedThreads.map((thread, index) => {
              const unread = isUnread(thread);
              const isSelected = selectedThread?.id === thread.id;
              
              return (
                <div
                  key={thread.id}
                  onClick={() => handleThreadSelect(thread)}
                  className={`relative mx-2 mb-1 px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 group
                    ${isSelected 
                      ? 'bg-blue-50 border-l-4 border-l-blue-500' 
                      : unread 
                        ? 'bg-blue-50/50 hover:bg-blue-50 border-l-4 border-l-blue-400' 
                        : 'hover:bg-slate-50 border-l-4 border-l-transparent hover:border-l-slate-200'
                    }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${getAvatarGradient(thread.name, thread.id)} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <span className="text-white font-semibold text-sm">
                        {getInitials(thread.name)}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`truncate text-sm ${unread ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                            {thread.name || `Thread #${thread.id}`}
                          </span>
                          {!thread.client_id && (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" title="No model assigned" />
                          )}
                        </div>
                        <span className={`text-[11px] flex-shrink-0 ml-2 ${unread ? 'text-blue-600 font-medium' : 'text-slate-400'}`}>
                          {thread.latest_message?.created_at ? customFormatDate(thread.latest_message.created_at) : ''}
                        </span>
                      </div>
                      
                      {thread.latest_message && (
                        <p className={`text-xs truncate ${unread ? 'text-slate-700' : 'text-slate-500'}`}>
                          <span className={unread ? 'font-medium' : ''}>
                            {getDisplayName(thread.latest_message.sender_phone_number)}:
                          </span>{' '}
                          {thread.latest_message.text}
                        </p>
                      )}
                    </div>

                    {/* Unread Badge */}
                    {unread && (
                      <div className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0 mt-1 shadow-sm shadow-blue-500/50"></div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {/* Load More Button */}
            {hasMoreThreads && onLoadMoreThreads && (
              <div className="px-4 py-3">
                <button
                  onClick={onLoadMoreThreads}
                  disabled={loadingMoreThreads}
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 disabled:hover:bg-slate-100 text-slate-600 text-xs font-medium rounded-xl transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loadingMoreThreads ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    `Load more (${filteredAndSortedThreads.length} shown)`
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
