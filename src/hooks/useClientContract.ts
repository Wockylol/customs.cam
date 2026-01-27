import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface ClientContract {
  contract_percentage: number | null;
  contract_term: string | null;
  contract_start_date: string | null;
  contract_resign_date: string | null;
}

export const useClientContract = (clientId: string | undefined) => {
  const [contract, setContract] = useState<ClientContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContract = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('clients')
        .select('contract_percentage, contract_term, contract_start_date, contract_resign_date')
        .eq('id', clientId)
        .single();

      if (error) {
        throw error;
      }

      setContract(data);
    } catch (err: any) {
      console.error('Error fetching client contract:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  const updateContract = async (contractData: Partial<ClientContract>) => {
    if (!clientId) {
      return { error: 'Client ID is required' };
    }

    try {
      // Build update object
      const updateData: any = {
        contract_percentage: contractData.contract_percentage,
        contract_term: contractData.contract_term,
        contract_start_date: contractData.contract_start_date,
        contract_resign_date: contractData.contract_resign_date,
      };

      // If a resign date is being set, automatically mark client as inactive
      if (contractData.contract_resign_date) {
        updateData.is_active = false;
        updateData.status = 'inactive';
      }

      const { error } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', clientId);

      if (error) {
        throw error;
      }

      // Refresh data
      await fetchContract();
      return { error: null };
    } catch (err: any) {
      console.error('Error updating client contract:', err);
      return { error: err.message };
    }
  };

  useEffect(() => {
    fetchContract();
  }, [fetchContract]);

  return {
    contract,
    loading,
    error,
    fetchContract,
    updateContract,
  };
};

