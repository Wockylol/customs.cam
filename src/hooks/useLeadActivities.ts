import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type LeadActivity = Database['public']['Tables']['lead_activities']['Row'];
type LeadActivityType = Database['public']['Enums']['lead_activity_type'];

export interface LeadActivityWithCreator extends LeadActivity {
  created_by_member?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
}

export const useLeadActivities = (clientId?: string) => {
  const [activities, setActivities] = useState<LeadActivityWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    if (!clientId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('lead_activities')
        .select(`
          *,
          created_by_member:team_members!lead_activities_created_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setActivities(data || []);
    } catch (err: any) {
      console.error('Error fetching lead activities:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  const logActivity = async (
    activityType: LeadActivityType,
    options?: {
      notes?: string;
      scheduledAt?: string;
      metadata?: Record<string, any>;
    }
  ) => {
    if (!clientId) {
      return { data: null, error: 'No client ID provided' };
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      let createdBy: string | null = null;

      if (user) {
        const { data: teamMember } = await supabase
          .from('team_members')
          .select('id')
          .eq('email', user.email)
          .single();
        createdBy = teamMember?.id || null;
      }

      const { data, error } = await supabase.rpc('log_lead_activity', {
        p_client_id: clientId,
        p_activity_type: activityType,
        p_notes: options?.notes || null,
        p_scheduled_at: options?.scheduledAt || null,
        p_metadata: options?.metadata || {},
        p_created_by: createdBy,
      });

      if (error) throw error;

      await fetchActivities();
      return { data, error: null };
    } catch (err: any) {
      console.error('Error logging lead activity:', err);
      return { data: null, error: err.message };
    }
  };

  const markActivityCompleted = async (activityId: string) => {
    try {
      const { error } = await supabase
        .from('lead_activities')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', activityId);

      if (error) throw error;

      setActivities(prev =>
        prev.map(activity =>
          activity.id === activityId
            ? { ...activity, completed_at: new Date().toISOString() }
            : activity
        )
      );

      return { error: null };
    } catch (err: any) {
      console.error('Error marking activity completed:', err);
      return { error: err.message };
    }
  };

  const scheduleCall = async (scheduledAt: string, notes?: string) => {
    return logActivity('call_scheduled', {
      scheduledAt,
      notes,
    });
  };

  const markCallCompleted = async (notes?: string) => {
    return logActivity('call_completed', { notes });
  };

  const sendContract = async (notes?: string) => {
    return logActivity('contract_sent', { notes });
  };

  const signContract = async (notes?: string) => {
    return logActivity('contract_signed', { notes });
  };

  const addNote = async (notes: string) => {
    return logActivity('note_added', { notes });
  };

  const getActivityLabel = (type: LeadActivityType): string => {
    const labels: Record<LeadActivityType, string> = {
      lead_discovered: 'Lead Discovered',
      form_sent: 'Intake Form Sent',
      form_completed: 'Intake Form Completed',
      call_scheduled: 'Call Scheduled',
      call_completed: 'Call Completed',
      contract_sent: 'Contract Sent',
      contract_signed: 'Contract Signed',
      portal_accessed: 'Portal Accessed',
      status_changed: 'Status Changed',
      note_added: 'Note Added',
    };
    return labels[type] || type;
  };

  const getActivityIcon = (type: LeadActivityType): string => {
    const icons: Record<LeadActivityType, string> = {
      lead_discovered: '🎯',
      form_sent: '📧',
      form_completed: '✅',
      call_scheduled: '📅',
      call_completed: '📞',
      contract_sent: '📄',
      contract_signed: '✍️',
      portal_accessed: '🚀',
      status_changed: '🔄',
      note_added: '📝',
    };
    return icons[type] || '📌';
  };

  const getActivityColor = (type: LeadActivityType): string => {
    const colors: Record<LeadActivityType, string> = {
      lead_discovered: 'bg-purple-100 text-purple-800',
      form_sent: 'bg-blue-100 text-blue-800',
      form_completed: 'bg-green-100 text-green-800',
      call_scheduled: 'bg-yellow-100 text-yellow-800',
      call_completed: 'bg-emerald-100 text-emerald-800',
      contract_sent: 'bg-orange-100 text-orange-800',
      contract_signed: 'bg-teal-100 text-teal-800',
      portal_accessed: 'bg-indigo-100 text-indigo-800',
      status_changed: 'bg-gray-100 text-gray-800',
      note_added: 'bg-sky-100 text-sky-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Set up realtime subscription
  useEffect(() => {
    if (!clientId) return;

    const channel = supabase
      .channel(`lead-activities-${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_activities',
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, fetchActivities]);

  return {
    activities,
    loading,
    error,
    fetchActivities,
    logActivity,
    markActivityCompleted,
    scheduleCall,
    markCallCompleted,
    sendContract,
    signContract,
    addNote,
    getActivityLabel,
    getActivityIcon,
    getActivityColor,
  };
};

