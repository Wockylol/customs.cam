import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface ClientPersonalInfo {
  id: string;
  client_id: string;
  legal_name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}

export const useClientPersonalInfo = (clientId?: string) => {
  const [personalInfo, setPersonalInfo] = useState<ClientPersonalInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPersonalInfo = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('client_personal_info')
        .select('*')
        .eq('client_id', id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      setPersonalInfo(data);
    } catch (err: any) {
      console.error('Error fetching client personal info:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const upsertPersonalInfo = async (
    clientId: string,
    data: {
      legalName?: string | null;
      email?: string | null;
      phone?: string | null;
      dateOfBirth?: string | null;
      address?: string | null;
    }
  ) => {
    try {
      const { error } = await supabase.rpc('upsert_client_personal_info', {
        p_client_id: clientId,
        p_legal_name: data.legalName || null,
        p_email: data.email || null,
        p_phone: data.phone || null,
        p_date_of_birth: data.dateOfBirth || null,
        p_address: data.address || null,
      });

      if (error) {
        throw error;
      }

      await fetchPersonalInfo(clientId);
      return { error: null };
    } catch (err: any) {
      console.error('Error upserting personal info:', err);
      return { error: err.message };
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchPersonalInfo(clientId);
    }
  }, [clientId]);

  return {
    personalInfo,
    loading,
    error,
    fetchPersonalInfo,
    upsertPersonalInfo,
  };
};

