import React, { useState, useMemo } from 'react';
import { MessageSquare, Search, RefreshCw, Settings, AlertTriangle, Users, ChevronDown, ChevronUp, Volume2, VolumeX, Filter } from 'lucide-react';
import { Button } from '../ui/Button';
import { formatDistanceToNow, format, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';

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
  // Filter and sort state
  const [filterType, setFilterType] = useState<'all' | 'unread'>('all');
  const [sortOrder, setSortOrder] = useState<'recent' | 'oldest'>('recent');

  // Helper function to safely format dates
  const safeFormatDate = (date: string | null) => {
    if (!date) return 'Unknown time';
    try {
      return format(new Date(date), 'MM/dd/yyyy');
    } catch (err) {
      console.error('Error formatting date:', date, err);
      return 'Invalid date';
    }
  };

  // Helper function to get display name from contact map
  const getDisplayName = (phone: string) => {
    return contactMap[phone] || phone;
  };

  // Helper function to format date/time as requested
  const customFormatDate = (date: string | null) => {
    if (!date) return 'Unknown time';
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch (err) {
      console.error('Error formatting date:', date, err);
      return 'Invalid date';
    }
  };

  const handleThreadSelect = (thread: Thread) => {
    console.log('Thread selected:', thread.id, 'marking as read...');
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
    } catch (error) {
      console.error('Error comparing dates for unread status:', error);
      return false;
    }
  };

  // Filter and sort threads
  const filteredAndSortedThreads = useMemo(() => {
    let result = [...threads];

    // Apply filter
    if (filterType === 'unread') {
      result = result.filter(thread => isUnread(thread));
    }

    // Apply sort
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

  return (
    <div className="w-80 border-r bg-white flex-shrink-0">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Client Chats</h1>
          <div className="flex items-center space-x-2">
            {onSoundToggle && (
              <button
                onClick={onSoundToggle}
                className={`p-2 rounded-lg transition-colors ${
                  soundEnabled 
                    ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
                title={soundEnabled ? 'Sound notifications enabled' : 'Sound notifications disabled'}
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
              </button>
            )}
            <Button
              variant="ghost"
              onClick={onRefresh}
              disabled={refreshing}
              className="flex items-center"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Management Tab */}
        <div className="mb-4">
          <button
            onClick={onShowManagement}
            className="w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all duration-200 bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
          >
            <div className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              <span className="font-medium">Management</span>
            </div>
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search chats..."
            className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          />
        </div>

        {/* Filter and Sort Controls */}
        <div className="mt-3 space-y-2">
          {/* Filter Type */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <div className="flex gap-1 flex-1">
              <button
                onClick={() => setFilterType('all')}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  filterType === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('unread')}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  filterType === 'unread'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Unread
              </button>
            </div>
          </div>

          {/* Sort Order */}
          <div className="flex gap-1">
            <button
              onClick={() => setSortOrder('recent')}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                sortOrder === 'recent'
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Recent First
            </button>
            <button
              onClick={() => setSortOrder('oldest')}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                sortOrder === 'oldest'
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Oldest First
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-y-auto h-[calc(100vh-16rem)]">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading threads...</p>
          </div>
        ) : filteredAndSortedThreads.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No threads found</h3>
            {searchQuery && (
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search terms
              </p>
            )}
            {filterType === 'unread' && !searchQuery && (
              <p className="mt-1 text-sm text-gray-500">
                No unread messages
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredAndSortedThreads.map((thread) => (
              <div
                key={thread.id}
                onClick={() => handleThreadSelect(thread)}
                className={`p-4 hover:bg-gray-50 cursor-pointer relative ${
                  selectedThread?.id === thread.id ? 'bg-primary/5' : ''
                } ${isUnread(thread) ? 'bg-blue-50' : ''}`}
              >
                {/* Unread blue dot indicator */}
                {isUnread(thread) && (
                  <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse shadow-sm"></div>
                )}
                
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center">
                    <MessageSquare className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="truncate max-w-[200px] font-medium text-gray-900">
                      {thread.name || `Thread #${thread.id}`}
                    </span>
                    {!thread.client_id && (
                      <AlertTriangle className="w-3 h-3 text-orange-500 ml-2" title="No model assigned" />
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {thread.latest_message?.created_at ? customFormatDate(thread.latest_message.created_at) : ''}
                  </span>
                </div>
                
                {thread.latest_message && (
                  <div className="ml-7">
                    <p className="text-sm text-gray-600 truncate">
                      <span className="font-medium">
                        {getDisplayName(thread.latest_message.sender_phone_number)}:
                      </span>{' '}
                      {thread.latest_message.text}
                    </p>
                  </div>
                )}
              </div>
            ))}
            
            {/* Load more threads button */}
            {hasMoreThreads && onLoadMoreThreads && (
              <div className="p-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLoadMoreThreads}
                  disabled={loadingMoreThreads}
                  className="w-full"
                >
                  {loadingMoreThreads ? (
                    <div className="flex items-center">
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Loading more threads...
                    </div>
                  ) : (
                    `Load more threads (${filteredAndSortedThreads.length} shown)`
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}