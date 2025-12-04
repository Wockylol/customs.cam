import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type Agency = Database['public']['Tables']['agencies']['Row'];
type AgencyInsert = Database['public']['Tables']['agencies']['Insert'];

export const useAgencies = () => {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgencies = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
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
  };

  const addAgency = async (agencyData: {
    name: string;
    slug: string;
    description?: string;
    contactEmail?: string;
    contactPhone?: string;
  }) => {
    try {
      const insertData: AgencyInsert = {
        name: agencyData.name,
        slug: agencyData.slug,
        description: agencyData.description || null,
        contact_email: agencyData.contactEmail || null,
        contact_phone: agencyData.contactPhone || null,
        is_active: true
      };

      const { data, error } = await supabase
        .from('agencies')
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
      const updateData: any = {};
      if (agencyData.name !== undefined) updateData.name = agencyData.name;
      if (agencyData.slug !== undefined) updateData.slug = agencyData.slug;
      if (agencyData.description !== undefined) updateData.description = agencyData.description || null;
      if (agencyData.contactEmail !== undefined) updateData.contact_email = agencyData.contactEmail || null;
      if (agencyData.contactPhone !== undefined) updateData.contact_phone = agencyData.contactPhone || null;
      if (agencyData.isActive !== undefined) updateData.is_active = agencyData.isActive;

      const { data, error } = await supabase
        .from('agencies')
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
        .from('agencies')
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
  }, []);

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