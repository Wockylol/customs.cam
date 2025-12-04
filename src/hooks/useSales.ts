import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { useAuth } from '../contexts/AuthContext';

type Sale = Database['public']['Tables']['chatter_sales']['Row'] & {
  clients?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  chatter?: {
    id: string;
    full_name: string;
    shift: string | null;
  };
  approver?: {
    id: string;
    full_name: string;
  };
};

type SaleInsert = Database['public']['Tables']['chatter_sales']['Insert'];

export const useSales = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { teamMember } = useAuth();

  const fetchSales = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('chatter_sales')
        .select(`
          *,
          clients (
            id,
            username,
            avatar_url
          ),
          chatter:team_members!chatter_sales_chatter_id_fkey (
            id,
            full_name,
            shift
          ),
          approver:team_members!chatter_sales_approved_by_fkey (
            id,
            full_name
          )
        `)
        .order('sale_date', { ascending: false });

      // If user is a chatter, only fetch their own sales
      if (teamMember?.role === 'chatter') {
        query = query.eq('chatter_id', teamMember.id);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      if (data) {
        setSales(data as Sale[]);
      }
    } catch (err: any) {
      console.error('Error fetching sales:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addSale = async (saleData: {
    clientId: string;
    saleDate: string;
    saleTime?: string;
    grossAmount: number;
    screenshotUrl?: string;
    notes?: string;
  }) => {
    try {
      if (!teamMember) {
        throw new Error('No authenticated user');
      }

      const insertData: SaleInsert = {
        chatter_id: teamMember.id,
        client_id: saleData.clientId,
        sale_date: saleData.saleDate,
        sale_time: saleData.saleTime || null,
        gross_amount: saleData.grossAmount,
        screenshot_url: saleData.screenshotUrl || null,
        notes: saleData.notes || null,
      };

      const { data, error } = await supabase
        .from('chatter_sales')
        .insert(insertData)
        .select(`
          *,
          clients (
            id,
            username,
            avatar_url
          ),
          chatter:team_members!chatter_sales_chatter_id_fkey (
            id,
            full_name,
            shift
          ),
          approver:team_members!chatter_sales_approved_by_fkey (
            id,
            full_name
          )
        `)
        .single();

      if (error) {
        throw error;
      }

      // Add the new sale to the local state
      if (data) {
        setSales(prev => [data as Sale, ...prev]);
      }
      return { data, error: null };
    } catch (err: any) {
      console.error('Error adding sale:', err);
      return { data: null, error: err.message };
    }
  };

  const updateSale = async (saleId: string, saleData: {
    clientId?: string;
    saleDate?: string;
    saleTime?: string;
    grossAmount?: number;
    screenshotUrl?: string;
    notes?: string;
  }) => {
    try {
      const updateData: any = {};
      if (saleData.clientId !== undefined) updateData.client_id = saleData.clientId;
      if (saleData.saleDate !== undefined) updateData.sale_date = saleData.saleDate;
      if (saleData.saleTime !== undefined) updateData.sale_time = saleData.saleTime || null;
      if (saleData.grossAmount !== undefined) updateData.gross_amount = saleData.grossAmount;
      if (saleData.screenshotUrl !== undefined) updateData.screenshot_url = saleData.screenshotUrl || null;
      if (saleData.notes !== undefined) updateData.notes = saleData.notes || null;

      const { data, error } = await supabase
        .from('chatter_sales')
        .update(updateData)
        .eq('id', saleId)
        .select(`
          *,
          clients (
            id,
            username,
            avatar_url
          ),
          chatter:team_members!chatter_sales_chatter_id_fkey (
            id,
            full_name
          ),
          approver:team_members!chatter_sales_approved_by_fkey (
            id,
            full_name
          )
        `)
        .single();

      if (error) {
        throw error;
      }

      // Update the sale in local state
      if (data) {
        setSales(prev =>
          prev.map(sale =>
            sale.id === saleId ? (data as Sale) : sale
          )
        );
      }
      return { data, error: null };
    } catch (err: any) {
      console.error('Error updating sale:', err);
      return { data: null, error: err.message };
    }
  };

  const deleteSale = async (saleId: string) => {
    try {
      const { error } = await supabase
        .from('chatter_sales')
        .delete()
        .eq('id', saleId);

      if (error) {
        throw error;
      }

      // Remove the sale from local state
      setSales(prev => prev.filter(sale => sale.id !== saleId));
      return { error: null };
    } catch (err: any) {
      console.error('Error deleting sale:', err);
      return { error: err.message };
    }
  };

  const approveSale = async (saleId: string, approved: boolean, notes?: string) => {
    try {
      if (!teamMember) {
        throw new Error('No authenticated user');
      }

      const updateData: any = {
        status: approved ? 'valid' : 'invalid',
        approved_by: teamMember.id,
        approved_at: new Date().toISOString(),
      };

      if (notes) {
        updateData.notes = notes;
      }

      const { data, error } = await supabase
        .from('chatter_sales')
        .update(updateData)
        .eq('id', saleId)
        .select(`
          *,
          clients (
            id,
            username,
            avatar_url
          ),
          chatter:team_members!chatter_sales_chatter_id_fkey (
            id,
            full_name,
            shift
          ),
          approver:team_members!chatter_sales_approved_by_fkey (
            id,
            full_name
          )
        `)
        .single();

      if (error) {
        throw error;
      }

      // Update the sale in local state
      if (data) {
        setSales(prev =>
          prev.map(sale =>
            sale.id === saleId ? (data as Sale) : sale
          )
        );
      }
      return { data, error: null };
    } catch (err: any) {
      console.error('Error approving sale:', err);
      return { data: null, error: err.message };
    }
  };

  useEffect(() => {
    fetchSales();
  }, [teamMember]);

  return {
    sales,
    loading,
    error,
    fetchSales,
    addSale,
    updateSale,
    deleteSale,
    approveSale,
  };
};

