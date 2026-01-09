import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type Client = Database['public']['Tables']['clients']['Row'];
type ClientStatus = Database['public']['Enums']['client_status'];
type LeadActivity = Database['public']['Tables']['lead_activities']['Row'];
type PlatformInterest = Database['public']['Tables']['platform_interests']['Row'];

export interface LeadWithDetails extends Client {
  platform_interests?: (PlatformInterest & { platform?: { id: string; name: string; icon: string | null; color: string } })[];
  lead_activities?: LeadActivity[];
  last_activity?: LeadActivity;
}

export const useLeads = () => {
  const [leads, setLeads] = useState<LeadWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all clients (leads and prospects) with their platform interests and last activity
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select(`
          *,
          platform_interests(
            id,
            platform_id,
            notes,
            created_at,
            platform:platforms(id, name, icon, color)
          )
        `)
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;

      // Fetch last activity for each client
      const clientIds = clientsData?.map(c => c.id) || [];
      
      if (clientIds.length > 0) {
        const { data: activitiesData, error: activitiesError } = await supabase
          .from('lead_activities')
          .select('*')
          .in('client_id', clientIds)
          .order('created_at', { ascending: false });

        if (activitiesError) throw activitiesError;

        // Group activities by client and get the latest one
        const lastActivityMap: Record<string, LeadActivity> = {};
        activitiesData?.forEach(activity => {
          if (!lastActivityMap[activity.client_id]) {
            lastActivityMap[activity.client_id] = activity;
          }
        });

        // Merge data
        const leadsWithDetails: LeadWithDetails[] = (clientsData || []).map(client => ({
          ...client,
          last_activity: lastActivityMap[client.id] || null,
        }));

        setLeads(leadsWithDetails);
      } else {
        setLeads([]);
      }
    } catch (err: any) {
      console.error('Error fetching leads:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createLead = async (leadData: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    leadSource?: string;
  }) => {
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

      const { data, error } = await supabase.rpc('create_lead_with_token', {
        p_first_name: leadData.firstName || null,
        p_last_name: leadData.lastName || null,
        p_email: leadData.email || null,
        p_phone: leadData.phone || null,
        p_lead_source: leadData.leadSource || null,
        p_created_by: createdBy,
      });

      if (error) throw error;

      await fetchLeads();
      return { data: data?.[0], error: null };
    } catch (err: any) {
      console.error('Error creating lead:', err);
      return { data: null, error: err.message };
    }
  };

  const updateLeadStatus = async (clientId: string, newStatus: ClientStatus, notes?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let updatedBy: string | null = null;

      if (user) {
        const { data: teamMember } = await supabase
          .from('team_members')
          .select('id')
          .eq('email', user.email)
          .single();
        updatedBy = teamMember?.id || null;
      }

      const { data, error } = await supabase.rpc('update_client_status', {
        p_client_id: clientId,
        p_new_status: newStatus,
        p_notes: notes || null,
        p_updated_by: updatedBy,
      });

      if (error) throw error;

      // Update local state
      setLeads(prev =>
        prev.map(lead =>
          lead.id === clientId ? { ...lead, status: newStatus } : lead
        )
      );

      return { success: true, error: null };
    } catch (err: any) {
      console.error('Error updating lead status:', err);
      return { success: false, error: err.message };
    }
  };

  const generateIntakeLink = async (leadData?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  }) => {
    try {
      const result = await createLead({
        ...leadData,
        leadSource: 'intake_link',
      });

      if (result.error) throw new Error(result.error);

      const intakeToken = result.data?.intake_token;
      const baseUrl = window.location.origin;
      const intakeLink = `${baseUrl}/intake?ref=${intakeToken}`;

      return { link: intakeLink, token: intakeToken, error: null };
    } catch (err: any) {
      console.error('Error generating intake link:', err);
      return { link: null, token: null, error: err.message };
    }
  };

  const getLeadsByStatus = useCallback((status: ClientStatus | 'all') => {
    if (status === 'all') return leads;
    return leads.filter(lead => lead.status === status);
  }, [leads]);

  const getLeadCounts = useCallback(() => {
    const counts: Record<ClientStatus | 'all', number> = {
      all: leads.length,
      lead: 0,
      prospect: 0,
      pending_contract: 0,
      active: 0,
      inactive: 0,
      churned: 0,
    };

    leads.forEach(lead => {
      if (lead.status && counts[lead.status] !== undefined) {
        counts[lead.status]++;
      }
    });

    return counts;
  }, [leads]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients',
        },
        () => {
          fetchLeads();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_activities',
        },
        () => {
          fetchLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLeads]);

  return {
    leads,
    loading,
    error,
    fetchLeads,
    createLead,
    updateLeadStatus,
    generateIntakeLink,
    getLeadsByStatus,
    getLeadCounts,
  };
};

