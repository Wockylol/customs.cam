import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type ClientPlatform = Database['public']['Tables']['client_platforms']['Row'] & {
  platform?: Database['public']['Tables']['platforms']['Row'];
};
type ClientPlatformInsert = Database['public']['Tables']['client_platforms']['Insert'];

export const useClientPlatforms = (clientId?: string) => {
  const [clientPlatforms, setClientPlatforms] = useState<ClientPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClientPlatforms = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('client_platforms')
        .select(`
          *,
          platform:platforms(*)
        `)
        .eq('client_id', id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setClientPlatforms(data || []);
    } catch (err: any) {
      console.error('Error fetching client platforms:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addClientPlatform = async (clientId: string, platformData: {
    platformId: string;
    accountName?: string;
    usernameOnPlatform?: string;
    profileUrl?: string;
    notes?: string;
  }) => {
    try {
      const insertData: ClientPlatformInsert = {
        client_id: clientId,
        platform_id: platformData.platformId,
        account_name: platformData.accountName || null,
        username_on_platform: platformData.usernameOnPlatform || null,
        profile_url: platformData.profileUrl || null,
        notes: platformData.notes || null,
        is_active: true
      };

      const { data, error } = await supabase
        .from('client_platforms')
        .insert(insertData)
        .select(`
          *,
          platform:platforms(*)
        `)
        .single();

      if (error) {
        throw error;
      }

      setClientPlatforms(prev => [data, ...prev]);
      return { data, error: null };
    } catch (err: any) {
      console.error('Error adding client platform:', err);
      return { data: null, error: err.message };
    }
  };

  const updateClientPlatform = async (clientPlatformId: string, platformData: {
    accountName?: string;
    usernameOnPlatform?: string;
    profileUrl?: string;
    notes?: string;
  }) => {
    try {
      const updateData: any = {};
      if (platformData.accountName !== undefined) updateData.account_name = platformData.accountName || null;
      if (platformData.usernameOnPlatform !== undefined) updateData.username_on_platform = platformData.usernameOnPlatform || null;
      if (platformData.profileUrl !== undefined) updateData.profile_url = platformData.profileUrl || null;
      if (platformData.notes !== undefined) updateData.notes = platformData.notes || null;

      const { data, error } = await supabase
        .from('client_platforms')
        .update(updateData)
        .eq('id', clientPlatformId)
        .select(`
          *,
          platform:platforms(*)
        `)
        .single();

      if (error) {
        throw error;
      }

      setClientPlatforms(prev => 
        prev.map(cp => cp.id === clientPlatformId ? data : cp)
      );
      return { data, error: null };
    } catch (err: any) {
      console.error('Error updating client platform:', err);
      return { data: null, error: err.message };
    }
  };

  const removeClientPlatform = async (clientPlatformId: string) => {
    try {
      const { error } = await supabase
        .from('client_platforms')
        .update({ is_active: false })
        .eq('id', clientPlatformId);

      if (error) {
        throw error;
      }

      setClientPlatforms(prev => prev.filter(cp => cp.id !== clientPlatformId));
      return { error: null };
    } catch (err: any) {
      console.error('Error removing client platform:', err);
      return { error: err.message };
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchClientPlatforms(clientId);
    }
  }, [clientId]);

  return {
    clientPlatforms,
    loading,
    error,
    fetchClientPlatforms,
    addClientPlatform,
    updateClientPlatform,
    removeClientPlatform
  };
};