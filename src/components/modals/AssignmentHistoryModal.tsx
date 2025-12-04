import React, { useState, useEffect } from 'react';
import { X, History, Users, Calendar, User, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import ClientAvatar from '../ui/ClientAvatar';

interface AssignmentHistory {
  id: string;
  chatter_id: string;
  client_id: string;
  assigned_by: string;
  assigned_at: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  chatter?: {
    id: string;
    full_name: string;
    email: string;
    shift: string | null;
  };
  client?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  assigned_by_member?: {
    full_name: string;
  };
}

interface AssignmentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: { type: 'chatter' | 'client'; id: string; name: string } | null;
}

const AssignmentHistoryModal: React.FC<AssignmentHistoryModalProps> = ({ 
  isOpen, 
  onClose, 
  target 
}) => {
  const [history, setHistory] = useState<AssignmentHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && target) {
      fetchHistory();
    }
  }, [isOpen, target]);

  const fetchHistory = async () => {
    if (!target) return;

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('chatter_assignments')
        .select(`
          *,
          chatter:team_members!chatter_id(id, full_name, email, shift),
          client:clients!client_id(id, username, avatar_url),
          assigned_by_member:team_members!assigned_by(full_name)
        `)
        .order('created_at', { ascending: false });

      if (target.type === 'chatter') {
        query = query.eq('chatter_id', target.id);
      } else {
        query = query.eq('client_id', target.id);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setHistory(data || []);
    } catch (err: any) {
      console.error('Error fetching assignment history:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? (
      <CheckCircle className="w-4 h-4 text-green-600" />
    ) : (
      <XCircle className="w-4 h-4 text-red-600" />
    );
  };

  const getStatusText = (isActive: boolean) => {
    return isActive ? 'Active' : 'Removed';
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-50 border-green-200 text-green-800'
      : 'bg-red-50 border-red-200 text-red-800';
  };

  if (!isOpen || !target) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                <History className="w-5 h-5 text-gray-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Assignment History - {target.name}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600">
              {target.type === 'chatter' 
                ? 'All client assignments for this chatter'
                : 'All chatter assignments for this client'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading assignment history...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8">
                <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No assignment history</h3>
                <p className="text-gray-600">
                  {target.type === 'chatter' 
                    ? 'This chatter has not been assigned to any clients yet.'
                    : 'This client has not been assigned to any chatters yet.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((assignment) => (
                  <div key={assignment.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start flex-1">
                        {target.type === 'chatter' ? (
                          /* Show client info when viewing chatter history */
                          <div className="flex items-center mr-4">
                            <ClientAvatar 
                              client={assignment.client || { username: 'unknown', avatar_url: null }} 
                              size="sm" 
                              className="mr-3" 
                            />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                @{assignment.client?.username || 'Unknown Client'}
                              </div>
                              <div className="text-xs text-gray-500">Client</div>
                            </div>
                          </div>
                        ) : (
                          /* Show chatter info when viewing client history */
                          <div className="flex items-center mr-4">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                              <Users className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {assignment.chatter?.full_name || 'Unknown Chatter'}
                              </div>
                              <div className="flex items-center text-xs text-gray-500">
                                <Clock className="w-3 h-3 mr-1" />
                                {assignment.chatter?.shift ? (
                                  assignment.chatter.shift === '10-6' ? 'Day Shift (10am-6pm)' :
                                  assignment.chatter.shift === '6-2' ? 'Evening Shift (6pm-2am)' :
                                  assignment.chatter.shift === '2-10' ? 'Night Shift (2am-10am)' :
                                  assignment.chatter.shift
                                ) : (
                                  'No shift'
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="text-sm text-gray-600">
                                {formatDate(assignment.assigned_at)}
                              </span>
                            </div>
                            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(assignment.is_active)}`}>
                              {getStatusIcon(assignment.is_active)}
                              <span className="ml-1">{getStatusText(assignment.is_active)}</span>
                            </div>
                          </div>
                          
                          <div className="text-xs text-gray-500 mb-2">
                            Assigned by: {assignment.assigned_by_member?.full_name || 'Unknown'}
                          </div>
                          
                          {assignment.notes && (
                            <div className="bg-white rounded-md p-2 border border-gray-200">
                              <p className="text-xs text-gray-600">{assignment.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentHistoryModal;