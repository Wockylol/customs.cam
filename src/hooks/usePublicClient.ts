import { useState, useEffect, useCallback } from 'react';
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

  const fetchClient = useCallback(async () => {
    if (!username) {
      setLoading(false);
      setClient(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Fetch client by username - this query should work without auth
      // as long as RLS allows public read on clients table
      const { data, error: fetchError } = await supabase
        .from('clients')
        .select('*')
        .ilike('username', username)
        .single();

      if (fetchError) {
        // Check if it's a "not found" error vs an actual error
        if (fetchError.code === 'PGRST116') {
          // No rows returned - client not found
          setClient(null);
        } else {
          throw fetchError;
        }
      } else {
        setClient(data);
      }
    } catch (err: any) {
      console.error('Error fetching public client:', err);
      setError(err.message);
      setClient(null);
    } finally {
      setLoading(false);
    }
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

