import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Debug panel to test real-time notifications
 * Add this temporarily to any page to diagnose issues
 * 
 * Usage:
 * import RealtimeDebugPanel from '../components/debug/RealtimeDebugPanel';
 * <RealtimeDebugPanel />
 */
const RealtimeDebugPanel: React.FC = () => {
  const { teamMember } = useAuth();
  const [logs, setLogs] = useState<string[]>([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('Not started');
  const [testResult, setTestResult] = useState<string>('');

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 20));
    console.log(`[Realtime Debug] ${message}`);
  };

  useEffect(() => {
    if (!teamMember) {
      addLog('⚠️ No team member found - not logged in?');
      return;
    }

    addLog(`✓ Team member loaded: ${teamMember.full_name} (${teamMember.id})`);

    const channel = supabase
      .channel(`debug-notifications-${teamMember.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_recipients',
          filter: `team_member_id=eq.${teamMember.id}`
        },
        (payload) => {
          addLog(`🔔 NEW NOTIFICATION RECEIVED!`);
          addLog(`   Payload: ${JSON.stringify(payload.new).substring(0, 100)}...`);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notification_recipients',
          filter: `team_member_id=eq.${teamMember.id}`
        },
        (payload) => {
          addLog(`📝 Notification updated`);
        }
      )
      .subscribe((status) => {
        addLog(`📡 Subscription status: ${status}`);
        setSubscriptionStatus(status);
      });

    addLog(`🚀 Started subscription for team member ID: ${teamMember.id}`);

    return () => {
      addLog('🛑 Unsubscribing from channel');
      supabase.removeChannel(channel);
    };
  }, [teamMember?.id]);

  const createTestNotification = async () => {
    if (!teamMember) {
      setTestResult('❌ No team member logged in');
      return;
    }

    try {
      addLog('🧪 Creating test notification...');
      
      // Create notification
      const { data: notification, error: notifError } = await supabase
        .from('notifications')
        .insert({
          type: 'test',
          title: 'Test Notification',
          message: 'This is a test notification created at ' + new Date().toLocaleTimeString(),
          link: '/notifications'
        })
        .select()
        .single();

      if (notifError) throw notifError;
      addLog(`✓ Created notification: ${notification.id}`);

      // Create recipient
      const { error: recipientError } = await supabase
        .from('notification_recipients')
        .insert({
          notification_id: notification.id,
          team_member_id: teamMember.id
        });

      if (recipientError) throw recipientError;
      
      addLog(`✓ Added recipient record`);
      setTestResult('✅ Test notification created! Should appear in 1-2 seconds...');
      
    } catch (error: any) {
      const errorMsg = `❌ Error: ${error.message}`;
      addLog(errorMsg);
      setTestResult(errorMsg);
    }
  };

  const checkRealtimeStatus = async () => {
    addLog('🔍 Checking database realtime status...');
    
    try {
      const { data, error } = await supabase
        .from('notification_recipients')
        .select('*')
        .limit(1);

      if (error) {
        addLog(`❌ Database query error: ${error.message}`);
      } else {
        addLog(`✓ Database query successful`);
      }

      // Check if realtime is enabled
      addLog(`⚠️ Run this SQL to check realtime:`);
      addLog(`   SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';`);
      
    } catch (error: any) {
      addLog(`❌ Connection error: ${error.message}`);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white border-2 border-blue-500 rounded-lg shadow-2xl z-50 overflow-hidden">
      <div className="bg-blue-500 text-white px-4 py-2 font-bold flex items-center justify-between">
        <span>🔧 Realtime Debug Panel</span>
        <span className={`text-xs px-2 py-1 rounded ${
          subscriptionStatus === 'SUBSCRIBED' ? 'bg-green-500' : 
          subscriptionStatus === 'CHANNEL_ERROR' ? 'bg-red-500' : 
          'bg-yellow-500'
        }`}>
          {subscriptionStatus}
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Team Member Info */}
        <div className="text-xs bg-gray-100 p-2 rounded">
          <strong>Team Member:</strong> {teamMember?.full_name || 'Not logged in'}<br/>
          <strong>ID:</strong> <code className="text-xs">{teamMember?.id || 'N/A'}</code><br/>
          <strong>Role:</strong> {teamMember?.role || 'N/A'}
        </div>

        {/* Test Buttons */}
        <div className="space-y-2">
          <button
            onClick={createTestNotification}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm font-medium"
            disabled={!teamMember}
          >
            🧪 Create Test Notification
          </button>
          
          <button
            onClick={checkRealtimeStatus}
            className="w-full bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 text-sm font-medium"
          >
            🔍 Check Realtime Status
          </button>

          {testResult && (
            <div className="text-xs p-2 bg-gray-100 rounded">
              {testResult}
            </div>
          )}
        </div>

        {/* Logs */}
        <div className="border border-gray-300 rounded p-2 h-64 overflow-y-auto bg-black text-green-400 font-mono text-xs">
          {logs.length === 0 ? (
            <div className="text-gray-500">Waiting for events...</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="mb-1">{log}</div>
            ))
          )}
        </div>

        {/* Instructions */}
        <div className="text-xs text-gray-600 border-t pt-2">
          <strong>Instructions:</strong>
          <ol className="list-decimal ml-4 mt-1 space-y-1">
            <li>Click "Create Test Notification"</li>
            <li>Watch for "🔔 NEW NOTIFICATION RECEIVED!" in logs</li>
            <li>Check notification bell in header</li>
            <li>If status isn't "SUBSCRIBED", check console</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default RealtimeDebugPanel;

