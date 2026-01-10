import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type PayrollSettings = {
  id: string;
  team_member_id: string;
  base_salary: number;
  commission_percentage: number;
  created_at: string;
  updated_at: string;
};

type PayrollBonus = {
  id: string;
  team_member_id: string;
  amount: number;
  reason: string;
  bonus_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  created_by_member?: {
    id: string;
    full_name: string;
  };
};

type TeamMemberPayroll = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  shift: string | null;
  is_active: boolean;
  payroll_settings: PayrollSettings | null;
  bonuses: PayrollBonus[];
  total_valid_sales: number;
};

export const usePayroll = () => {
  const [payrollData, setPayrollData] = useState<TeamMemberPayroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { teamMember } = useAuth();

  const fetchPayrollData = async (month?: number, year?: number) => {
    try {
      setLoading(true);
      setError(null);

      // If no month/year provided, use current month
      const now = new Date();
      const targetMonth = month ?? now.getMonth() + 1;
      const targetYear = year ?? now.getFullYear();

      // Fetch all team members
      const { data: teamMembers, error: teamError } = await supabase
        .from('team_members')
        .select('*')
        .order('full_name', { ascending: true });

      if (teamError) throw teamError;

      // Fetch all payroll settings
      const { data: settings, error: settingsError } = await supabase
        .from('payroll_settings')
        .select('*');

      if (settingsError) throw settingsError;

      // Fetch bonuses for the selected month
      const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
      const endDate = new Date(targetYear, targetMonth, 0); // Last day of month
      const endDateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

      const { data: bonuses, error: bonusError } = await supabase
        .from('payroll_bonuses')
        .select(`
          *,
          created_by_member:team_members!payroll_bonuses_created_by_fkey (
            id,
            full_name
          )
        `)
        .gte('bonus_date', startDate)
        .lte('bonus_date', endDateStr);

      if (bonusError) throw bonusError;

      // Fetch sales for the selected month
      const { data: sales, error: salesError } = await supabase
        .from('chatter_sales')
        .select('chatter_id, gross_amount')
        .eq('status', 'valid')
        .gte('sale_date', startDate)
        .lte('sale_date', endDateStr);

      if (salesError) throw salesError;

      // Calculate total sales per chatter
      const salesByChatter = sales?.reduce((acc, sale) => {
        if (!acc[sale.chatter_id]) {
          acc[sale.chatter_id] = 0;
        }
        acc[sale.chatter_id] += Number(sale.gross_amount);
        return acc;
      }, {} as Record<string, number>) || {};

      // Group bonuses by team member
      const bonusesByMember = bonuses?.reduce((acc, bonus) => {
        if (!acc[bonus.team_member_id]) {
          acc[bonus.team_member_id] = [];
        }
        acc[bonus.team_member_id].push(bonus as PayrollBonus);
        return acc;
      }, {} as Record<string, PayrollBonus[]>) || {};

      // Combine all data
      const payroll: TeamMemberPayroll[] = (teamMembers || []).map(member => {
        const memberSettings = settings?.find(s => s.team_member_id === member.id) || null;
        const memberBonuses = bonusesByMember[member.id] || [];
        const totalSales = salesByChatter[member.id] || 0;

        return {
          id: member.id,
          full_name: member.full_name,
          email: member.email,
          role: member.role,
          shift: member.shift,
          is_active: member.is_active,
          payroll_settings: memberSettings as PayrollSettings | null,
          bonuses: memberBonuses,
          total_valid_sales: totalSales,
        };
      });

      setPayrollData(payroll);
    } catch (err: any) {
      console.error('Error fetching payroll data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updatePayrollSettings = async (
    teamMemberId: string,
    baseSalary: number,
    commissionPercentage: number
  ) => {
    try {
      // Check if settings exist
      const { data: existing } = await supabase
        .from('payroll_settings')
        .select('id')
        .eq('team_member_id', teamMemberId)
        .maybeSingle();

      let result;
      if (existing) {
        // Update existing
        result = await supabase
          .from('payroll_settings')
          .update({
            base_salary: baseSalary,
            commission_percentage: commissionPercentage,
          })
          .eq('team_member_id', teamMemberId)
          .select()
          .single();
      } else {
        // Insert new
        result = await supabase
          .from('payroll_settings')
          .insert({
            team_member_id: teamMemberId,
            base_salary: baseSalary,
            commission_percentage: commissionPercentage,
          })
          .select()
          .single();
      }

      if (result.error) throw result.error;

      // Update local state
      setPayrollData(prev =>
        prev.map(member =>
          member.id === teamMemberId
            ? { ...member, payroll_settings: result.data as PayrollSettings }
            : member
        )
      );

      return { data: result.data, error: null };
    } catch (err: any) {
      console.error('Error updating payroll settings:', err);
      return { data: null, error: err.message };
    }
  };

  const addBonus = async (
    teamMemberIds: string[],
    amount: number,
    reason: string,
    bonusDate?: string
  ) => {
    try {
      if (!teamMember) {
        throw new Error('No authenticated user');
      }

      const date = bonusDate || new Date().toISOString().split('T')[0];

      // Insert multiple bonuses
      const bonusesData = teamMemberIds.map(memberId => ({
        team_member_id: memberId,
        amount,
        reason,
        bonus_date: date,
        created_by: teamMember.id,
      }));

      const { data, error } = await supabase
        .from('payroll_bonuses')
        .insert(bonusesData)
        .select(`
          *,
          created_by_member:team_members!payroll_bonuses_created_by_fkey (
            id,
            full_name
          )
        `);

      if (error) throw error;

      // Update local state
      setPayrollData(prev =>
        prev.map(member => {
          const newBonuses = (data as PayrollBonus[]).filter(b => b.team_member_id === member.id);
          if (newBonuses.length > 0) {
            return {
              ...member,
              bonuses: [...member.bonuses, ...newBonuses],
            };
          }
          return member;
        })
      );

      return { data, error: null };
    } catch (err: any) {
      console.error('Error adding bonus:', err);
      return { data: null, error: err.message };
    }
  };

  const deleteBonus = async (bonusId: string) => {
    try {
      const { error } = await supabase
        .from('payroll_bonuses')
        .delete()
        .eq('id', bonusId);

      if (error) throw error;

      // Update local state
      setPayrollData(prev =>
        prev.map(member => ({
          ...member,
          bonuses: member.bonuses.filter(b => b.id !== bonusId),
        }))
      );

      return { error: null };
    } catch (err: any) {
      console.error('Error deleting bonus:', err);
      return { error: err.message };
    }
  };

  useEffect(() => {
    if (teamMember?.role === 'admin' || teamMember?.role === 'owner') {
      fetchPayrollData();
    }
  }, [teamMember]);

  return {
    payrollData,
    loading,
    error,
    fetchPayrollData,
    updatePayrollSettings,
    addBonus,
    deleteBonus,
  };
};

