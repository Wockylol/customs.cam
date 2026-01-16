import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type Client = Database['public']['Tables']['clients']['Row'];

/**
 * Hook to fetch a single client by username without requiring authentication.
 * Used for public-facing views like MobileClientView and PublicClientView.
 */
export const usePublicClient = (username: string | undefined) => {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchAttempted = useRef(false);

  const fetchClient = useCallback(async () => {
    if (!username) {
      console.log('[usePublicClient] No username provided, skipping fetch');
      setLoading(false);
      setClient(null);
      return;
    }

    // Prevent duplicate fetches
    if (fetchAttempted.current) {
      console.log('[usePublicClient] Fetch already attempted for:', username);
      return;
    }
    fetchAttempted.current = true;

    console.log('[usePublicClient] Fetching client for username:', username);

    try {
      setLoading(true);
      setError(null);
      
      // Fetch client by username - this query works without auth
      // RLS policies allow anonymous read on clients table
      const { data, error: fetchError } = await supabase
        .from('clients')
        .select('*')
        .ilike('username', username)
        .single();

      console.log('[usePublicClient] Fetch result:', { data: data ? 'found' : 'not found', error: fetchError });

      if (fetchError) {
        // Check if it's a "not found" error vs an actual error
        if (fetchError.code === 'PGRST116') {
          // No rows returned - client not found
          console.log('[usePublicClient] Client not found for username:', username);
          setClient(null);
        } else {
          console.error('[usePublicClient] Fetch error:', fetchError);
          throw fetchError;
        }
      } else {
        console.log('[usePublicClient] Client found:', data?.username);
        setClient(data);
      }
    } catch (err: any) {
      console.error('[usePublicClient] Error fetching public client:', err);
      setError(err.message);
      setClient(null);
    } finally {
      setLoading(false);
    }
  }, [username]);

  // Reset fetch attempted when username changes
  useEffect(() => {
    fetchAttempted.current = false;
  }, [username]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  return {
    client,
    loading,
    error,
    refetch: fetchClient
  };
};

