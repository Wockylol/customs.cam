import React from 'react';
import { Settings, AlertTriangle, CheckCircle2, MessageSquare, ArrowRight } from 'lucide-react';

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

// Generate a consistent gradient based on thread name/id
const getAvatarGradient = (name: string | null, id: number): string => {
  const gradients = [
    'from-amber-400 to-orange-500',
    'from-rose-400 to-red-500',
    'from-fuchsia-400 to-pink-500',
    'from-violet-400 to-purple-500',
    'from-blue-400 to-indigo-500',
    'from-cyan-400 to-teal-500',
    'from-emerald-400 to-green-500',
    'from-lime-400 to-green-500',
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

export function ManagementView({ threads, onThreadSelect, contactMap }: ManagementViewProps) {
  const unassignedThreads = threads.filter(thread => !thread.client_id);

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 flex-shrink-0">
        <div className="px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center shadow-lg">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Thread Management</h2>
              <p className="text-sm text-slate-500 mt-0.5">Organize and manage your chat threads</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Unassigned Threads Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Card Header */}
          <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Unassigned Threads</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Threads without an assigned model</p>
                </div>
              </div>
              <div className={`px-3 py-1.5 rounded-full text-sm font-bold ${
                unassignedThreads.length > 0 
                  ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                  : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              }`}>
                {unassignedThreads.length}
              </div>
            </div>
          </div>
          
          {/* Card Content */}
          <div className="p-4">
            {unassignedThreads.length === 0 ? (
              <div className="text-center py-12 px-6">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h4 className="text-base font-semibold text-slate-700 mb-2">All threads assigned!</h4>
                <p className="text-sm text-slate-500 max-w-xs mx-auto">
                  Great job! Every thread has been assigned to a model.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {unassignedThreads.map((thread) => (
                  <button
                    key={thread.id}
                    onClick={() => onThreadSelect(thread)}
                    className="w-full flex items-center gap-3 p-3 bg-amber-50/50 hover:bg-amber-100/70 border border-amber-200/60 rounded-xl transition-all duration-200 group"
                  >
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarGradient(thread.name, thread.id)} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <span className="text-white font-semibold text-sm">
                        {getInitials(thread.name)}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 text-left">
                      <span className="block font-semibold text-slate-800 truncate">
                        {thread.name || `Thread #${thread.id}`}
                      </span>
                      {thread.latest_message && (
                        <span className="block text-xs text-slate-500 truncate mt-0.5">
                          {thread.latest_message.text}
                        </span>
                      )}
                    </div>

                    {/* Action indicator */}
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-1 rounded-md">
                        Assign
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats Summary */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{threads.length}</p>
                <p className="text-xs text-slate-500">Total Threads</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{threads.length - unassignedThreads.length}</p>
                <p className="text-xs text-slate-500">Assigned</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
