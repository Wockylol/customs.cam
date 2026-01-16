import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type CustomRequest = Database['public']['Tables']['custom_requests']['Row'];

/**
 * Hook to fetch custom requests for a client by username without requiring authentication.
 * Used for public-facing views like MobileClientView.
 */
export const usePublicCustomRequests = (clientId: string | undefined) => {
  const [customRequests, setCustomRequests] = useState<CustomRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetchedClientId = useRef<string | undefined>(undefined);

  const fetchCustomRequests = useCallback(async () => {
    if (!clientId) {
      console.log('[usePublicCustomRequests] No clientId provided, skipping fetch');
      setLoading(false);
      setCustomRequests([]);
      return;
    }

    // Prevent duplicate fetches for the same client
    if (lastFetchedClientId.current === clientId) {
      console.log('[usePublicCustomRequests] Already fetched for clientId:', clientId);
      return;
    }

    console.log('[usePublicCustomRequests] Fetching custom requests for clientId:', clientId);

    try {
      setLoading(true);
      setError(null);
      lastFetchedClientId.current = clientId;
      
      const { data, error: fetchError } = await supabase
        .from('custom_requests')
        .select(`
          *,
          clients!inner(username, tenant_id),
          team_members!created_by(full_name),
          team_approved_member:team_members!team_approved_by(full_name)
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      console.log('[usePublicCustomRequests] Fetch result:', { 
        count: data?.length || 0, 
        error: fetchError 
      });

      if (fetchError) {
        throw fetchError;
      }

      setCustomRequests(data || []);
    } catch (err: any) {
      console.error('[usePublicCustomRequests] Error fetching:', err);
      setError(err.message);
      setCustomRequests([]);
      lastFetchedClientId.current = undefined; // Reset on error to allow retry
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  // Client approval action - doesn't require auth
  const approveByClient = async (customId: string, estimatedDeliveryDate: string) => {
    try {
      const { data, error } = await (supabase
        .from('custom_requests') as any)
        .update({ 
          status: 'in_progress',
          client_approved_at: new Date().toISOString(),
          estimated_delivery_date: estimatedDeliveryDate
        })
        .eq('id', customId)
        .select(`
          *,
          clients!inner(username),
          team_members!created_by(full_name)
        `)
        .single();

      if (error) {
        throw error;
      }

      // Update the local state
      setCustomRequests(prev => 
        prev.map(request => 
          request.id === customId ? data : request
        )
      );

      return { data, error: null };
    } catch (err: any) {
      console.error('Error approving by client:', err);
      return { data: null, error: err.message };
    }
  };

  // Mark as completed action - doesn't require auth
  const markAsCompleted = async (customId: string) => {
    try {
      const { data, error } = await (supabase
        .from('custom_requests') as any)
        .update({ 
          status: 'completed',
          date_completed: new Date().toISOString().split('T')[0]
        })
        .eq('id', customId)
        .select(`
          *,
          clients!inner(username),
          team_members!created_by(full_name)
        `)
        .single();

      if (error) {
        throw error;
      }

      // Update the local state
      setCustomRequests(prev => 
        prev.map(request => 
          request.id === customId ? data : request
        )
      );

      return { data, error: null };
    } catch (err: any) {
      console.error('Error marking custom as completed:', err);
      return { data: null, error: err.message };
    }
  };

  useEffect(() => {
    fetchCustomRequests();
  }, [fetchCustomRequests]);

  return {
    customRequests,
    loading,
    error,
    fetchCustomRequests,
    approveByClient,
    markAsCompleted
  };
};

