import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { createNewClientNotification } from '../lib/notificationHelpers';
import { useAuth } from '../contexts/AuthContext';

type Client = Database['public']['Tables']['clients']['Row'];
type ClientInsert = Database['public']['Tables']['clients']['Insert'];

export const useClients = () => {
  const { teamMember } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    // Don't fetch until we have tenant context
    if (!teamMember?.tenant_id) {
      setLoading(false);
      return;
    }

    try {
      // Don't clear existing data during refetch to prevent UI flicker
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('tenant_id', teamMember.tenant_id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Only update if we got data
      if (data) {
        setClients(data);
      }
    } catch (err: any) {
      console.error('Error fetching clients:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [teamMember?.tenant_id]);

  const addClient = async (clientData: {
    username: string;
    phone?: string;
    agencyId?: string;
  }) => {
    try {
      const insertData: ClientInsert = {
        username: clientData.username,
        phone: clientData.phone || null,
        agency_id: clientData.agencyId || null,
        tenant_id: teamMember?.tenant_id || null,
        is_active: true
      };

      const { data, error } = await supabase
        .from('clients')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Add the new client to the local state
      setClients(prev => [data, ...prev]);

      // Get current user's team member ID
      const { data: { user } } = await supabase.auth.getUser();
      let teamMemberId: string | null = null;
      
      if (user) {
        const { data: teamMember } = await supabase
          .from('team_members')
          .select('id')
          .eq('email', user.email)
          .single();
        teamMemberId = teamMember?.id || null;
      }

      // Send notification (database trigger also handles this, but this provides a backup)
      await createNewClientNotification(data.id, data.username, teamMemberId);

      return { data, error: null };
    } catch (err: any) {
      console.error('Error adding client:', err);
      return { data: null, error: err.message };
    }
  };

  const updateClient = async (clientId: string, clientData: {
    username?: string;
    phone?: string;
    agencyId?: string;
    avatarUrl?: string;
  }) => {
    try {
      const updateData: any = {};
      if (clientData.username !== undefined) updateData.username = clientData.username;
      if (clientData.phone !== undefined) updateData.phone = clientData.phone || null;
      if (clientData.agencyId !== undefined) updateData.agency_id = clientData.agencyId || null;
      if (clientData.avatarUrl !== undefined) updateData.avatar_url = clientData.avatarUrl || null;

      const { data, error } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', clientId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update the client in local state
      setClients(prev => 
        prev.map(client => 
          client.id === clientId ? data : client
        )
      );
      return { data, error: null };
    } catch (err: any) {
      console.error('Error updating client:', err);
      return { data: null, error: err.message };
    }
  };

  const deleteClient = async (clientId: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) {
        throw error;
      }

      // Remove the client from local state
      setClients(prev => prev.filter(client => client.id !== clientId));
      return { error: null };
    } catch (err: any) {
      console.error('Error deleting client:', err);
      return { error: err.message };
    }
  };
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Preload avatar images in the background after initial fetch
  useEffect(() => {
    if (!loading && clients.length > 0) {
      // Use requestIdleCallback to preload images during idle time
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          clients.forEach(client => {
            if (client.avatar_url) {
              const img = new Image();
              img.src = client.avatar_url;
            }
          });
        });
      } else {
        // Fallback for browsers that don't support requestIdleCallback
        setTimeout(() => {
          clients.forEach(client => {
            if (client.avatar_url) {
              const img = new Image();
              img.src = client.avatar_url;
            }
          });
        }, 100);
      }
    }
  }, [clients, loading]);

  return {
    clients,
    loading,
    error,
    fetchClients,
    addClient,
    updateClient,
    deleteClient
  };
};