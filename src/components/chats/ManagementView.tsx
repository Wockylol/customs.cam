import React from 'react';
import { Settings, AlertTriangle, Users, MessageSquare, Clock, User } from 'lucide-react';

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
  last_read_at?: string;
}

interface ManagementViewProps {
  threads: Thread[];
  onThreadSelect: (thread: Thread) => void;
  contactMap: Record<string, string>;
}

export function ManagementView({ threads, onThreadSelect, contactMap }: ManagementViewProps) {
  // Get unassigned threads (no client_id)
  const unassignedThreads = threads.filter(thread => !thread.client_id);

  return (
    <div className="flex-1 bg-gray-50 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-white border-b shadow-sm flex-shrink-0">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
            <Settings className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Thread Management</h2>
            <p className="text-sm text-gray-600">Manage and organize chat threads</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Unassigned Threads Section */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Unassigned Threads</h3>
                  <p className="text-sm text-gray-600">Click to open thread</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                unassignedThreads.length > 0 
                  ? 'bg-orange-100 text-orange-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {unassignedThreads.length}
              </span>
            </div>
          </div>
          
          <div className="p-6">
            {unassignedThreads.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-green-900 mb-2">All threads assigned!</h3>
              </div>
            ) : (
              <div className="space-y-2">
                {unassignedThreads.map((thread) => (
                  <button
                    key={thread.id}
                    onClick={() => onThreadSelect(thread)}
                    className="w-full text-left p-3 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">
                        {thread.name || `Thread #${thread.id}`}
                      </span>
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}