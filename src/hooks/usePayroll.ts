import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Helper function to fetch all records with pagination (bypasses 1000 row limit)
async function fetchAllRecords<T>(
  query: any,
  pageSize: number = 1000
): Promise<{ data: T[] | null; error: any }> {
  let allData: T[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await query.range(from, from + pageSize - 1);
    
    if (error) {
      return { data: null, error };
    }

    if (data && data.length > 0) {
      allData = [...allData, ...data];
      from += pageSize;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  return { data: allData, error: null };
}

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

type AttendanceStats = {
  daysWorked: number;
  missedHours: number;
  noShowDays: number;
  daysOff: number;
  lateCount: number;
  leftEarlyCount: number;
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
  attendance: AttendanceStats;
};

// Helper to parse time string (e.g., "2:30" or "02:30") to hours
function parseTimeToHours(timeStr: string | null): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    return hours + (minutes / 60);
  }
  return 0;
}

export const usePayroll = () => {
  const [payrollData, setPayrollData] = useState<TeamMemberPayroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { teamMember } = useAuth();

  const fetchPayrollData = useCallback(async (month?: number, year?: number) => {
    // Don't fetch until we have tenant context
    if (!teamMember?.tenant_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // If no month/year provided, use current month
      const now = new Date();
      const targetMonth = month ?? now.getMonth() + 1;
      const targetYear = year ?? now.getFullYear();

      // Fetch all team members filtered by tenant
      const { data: teamMembers, error: teamError } = await supabase
        .from('team_members')
        .select('*')
        .eq('tenant_id', teamMember.tenant_id)
        .order('full_name', { ascending: true });

      if (teamError) throw teamError;

      // Get team member IDs for this tenant to filter related data
      const teamMemberIds = (teamMembers || []).map(m => m.id);

      // Fetch payroll settings for this tenant's team members only
      const { data: settings, error: settingsError } = await supabase
        .from('payroll_settings')
        .select('*')
        .in('team_member_id', teamMemberIds);

      if (settingsError) throw settingsError;

      // Fetch bonuses for the selected month (with pagination)
      const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
      const endDate = new Date(targetYear, targetMonth, 0); // Last day of month
      const endDateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

      const bonusQuery = supabase
        .from('payroll_bonuses')
        .select(`
          *,
          created_by_member:team_members!payroll_bonuses_created_by_fkey (
            id,
            full_name
          )
        `)
        .in('team_member_id', teamMemberIds)
        .gte('bonus_date', startDate)
        .lte('bonus_date', endDateStr);

      const { data: bonuses, error: bonusError } = await fetchAllRecords<PayrollBonus>(bonusQuery);

      if (bonusError) throw bonusError;

      // Fetch ALL sales for the selected month (using pagination to bypass 1000 row limit)
      // Filter by team member IDs to ensure we only get sales for this tenant
      const salesQuery = supabase
        .from('chatter_sales')
        .select('chatter_id, gross_amount')
        .in('chatter_id', teamMemberIds)
        .eq('status', 'valid')
        .gte('sale_date', startDate)
        .lte('sale_date', endDateStr);

      const { data: sales, error: salesError } = await fetchAllRecords<{ chatter_id: string; gross_amount: number }>(salesQuery);

      if (salesError) throw salesError;
      
      console.log(`[Payroll] Fetched ${sales?.length || 0} valid sales records for ${targetMonth}/${targetYear}`);

      // Fetch attendance records for the month
      const attendanceQuery = supabase
        .from('attendance_records')
        .select('team_member_id, date, status, clock_in_time, clock_out_time')
        .in('team_member_id', teamMemberIds)
        .gte('date', startDate)
        .lte('date', endDateStr);

      const { data: attendance, error: attendanceError } = await fetchAllRecords<{
        team_member_id: string;
        date: string;
        status: string;
        clock_in_time: string | null;
        clock_out_time: string | null;
      }>(attendanceQuery);

      if (attendanceError) throw attendanceError;

      console.log(`[Payroll] Fetched ${attendance?.length || 0} attendance records for ${targetMonth}/${targetYear}`);

      // Calculate attendance stats per team member
      const attendanceByMember = (attendance || []).reduce((acc, record) => {
        if (!acc[record.team_member_id]) {
          acc[record.team_member_id] = {
            daysWorked: 0,
            missedHours: 0,
            noShowDays: 0,
            daysOff: 0,
            lateCount: 0,
            leftEarlyCount: 0,
          };
        }

        const stats = acc[record.team_member_id];

        switch (record.status) {
          case 'on_time':
            stats.daysWorked += 1;
            break;
          case 'late':
            stats.daysWorked += 1;
            stats.lateCount += 1;
            stats.missedHours += parseTimeToHours(record.clock_in_time);
            break;
          case 'left_early':
            stats.daysWorked += 1;
            stats.leftEarlyCount += 1;
            stats.missedHours += parseTimeToHours(record.clock_out_time);
            break;
          case 'late_and_left_early':
            stats.daysWorked += 1;
            stats.lateCount += 1;
            stats.leftEarlyCount += 1;
            stats.missedHours += parseTimeToHours(record.clock_in_time) + parseTimeToHours(record.clock_out_time);
            break;
          case 'no_show':
            stats.noShowDays += 1;
            stats.missedHours += 8; // Full shift missed
            break;
          case 'day_off':
            stats.daysOff += 1;
            break;
        }

        return acc;
      }, {} as Record<string, AttendanceStats>);

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
        const memberAttendance = attendanceByMember[member.id] || {
          daysWorked: 0,
          missedHours: 0,
          noShowDays: 0,
          daysOff: 0,
          lateCount: 0,
          leftEarlyCount: 0,
        };

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
          attendance: memberAttendance,
        };
      });

      setPayrollData(payroll);
    } catch (err: any) {
      console.error('Error fetching payroll data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [teamMember?.tenant_id]);

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

  // Note: fetchPayrollData is called by the PayrollSheet page when permission is granted
  // No automatic fetch here - let the page control when to fetch based on permissions

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

