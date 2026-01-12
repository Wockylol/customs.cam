import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useTenant } from '../contexts/TenantContext';
import { useAuth } from '../contexts/AuthContext';

// Managed Agency type (B2B partners, not tenant agencies)
interface ManagedAgency {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_active: boolean;
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
}

type Agency = ManagedAgency;

export const useAgencies = () => {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { tenant } = useTenant();
  const { teamMember } = useAuth();

  const fetchAgencies = useCallback(async () => {
    // Don't fetch until we have tenant context
    if (!teamMember?.tenant_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Fetch from managed_agencies filtered by tenant
      const { data, error } = await supabase
        .from('managed_agencies')
        .select('*')
        .eq('tenant_id', teamMember.tenant_id)
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      setAgencies(data || []);
    } catch (err: any) {
      console.error('Error fetching agencies:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [teamMember?.tenant_id]);

  const addAgency = async (agencyData: {
    name: string;
    slug: string;
    description?: string;
    contactEmail?: string;
    contactPhone?: string;
  }) => {
    try {
      if (!tenant) {
        throw new Error('No tenant context available');
      }

      const insertData = {
        name: agencyData.name,
        slug: agencyData.slug,
        description: agencyData.description || null,
        contact_email: agencyData.contactEmail || null,
        contact_phone: agencyData.contactPhone || null,
        is_active: true,
        tenant_id: tenant.id
      };

      const { data, error } = await supabase
        .from('managed_agencies')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Add the new agency to the local state
      setAgencies(prev => [data, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
      return { data, error: null };
    } catch (err: any) {
      console.error('Error adding agency:', err);
      return { data: null, error: err.message };
    }
  };

  const updateAgency = async (agencyId: string, agencyData: {
    name?: string;
    slug?: string;
    description?: string;
    contactEmail?: string;
    contactPhone?: string;
    isActive?: boolean;
  }) => {
    try {
      const updateData: Record<string, unknown> = {};
      if (agencyData.name !== undefined) updateData.name = agencyData.name;
      if (agencyData.slug !== undefined) updateData.slug = agencyData.slug;
      if (agencyData.description !== undefined) updateData.description = agencyData.description || null;
      if (agencyData.contactEmail !== undefined) updateData.contact_email = agencyData.contactEmail || null;
      if (agencyData.contactPhone !== undefined) updateData.contact_phone = agencyData.contactPhone || null;
      if (agencyData.isActive !== undefined) updateData.is_active = agencyData.isActive;

      const { data, error } = await supabase
        .from('managed_agencies')
        .update(updateData)
        .eq('id', agencyId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update the agency in local state
      setAgencies(prev => 
        prev.map(agency => 
          agency.id === agencyId ? data : agency
        ).sort((a, b) => a.name.localeCompare(b.name))
      );
      return { data, error: null };
    } catch (err: any) {
      console.error('Error updating agency:', err);
      return { data: null, error: err.message };
    }
  };

  const deleteAgency = async (agencyId: string) => {
    try {
      const { error } = await supabase
        .from('managed_agencies')
        .delete()
        .eq('id', agencyId);

      if (error) {
        throw error;
      }

      // Remove the agency from local state
      setAgencies(prev => prev.filter(agency => agency.id !== agencyId));
      return { error: null };
    } catch (err: any) {
      console.error('Error deleting agency:', err);
      return { error: err.message };
    }
  };

  useEffect(() => {
    fetchAgencies();
  }, [fetchAgencies]);

  return {
    agencies,
    loading,
    error,
    fetchAgencies,
    addAgency,
    updateAgency,
    deleteAgency
  };
};