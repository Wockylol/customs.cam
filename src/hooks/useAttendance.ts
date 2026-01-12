import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';

type AttendanceRecord = Database['public']['Tables']['attendance_records']['Row'];
type AttendanceInsert = Database['public']['Tables']['attendance_records']['Insert'];
type AttendanceUpdate = Database['public']['Tables']['attendance_records']['Update'];

export const useAttendance = (date?: string, month?: string, viewMode?: 'daily' | 'monthly') => {
  const { user, teamMember } = useAuth();
  const { tenant } = useTenant();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAttendance = async (targetDate: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          *,
          team_member:team_members!team_member_id(id, full_name, shift),
          recorded_by_member:team_members!recorded_by(full_name)
        `)
        .eq('date', targetDate)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setAttendanceRecords(data || []);
    } catch (err: any) {
      console.error('Error fetching attendance:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyAttendance = async (targetMonth: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get start and end dates for the month
      const startDate = `${targetMonth}-01`;
      const endDate = new Date(parseInt(targetMonth.split('-')[0]), parseInt(targetMonth.split('-')[1]), 0)
        .toISOString().split('T')[0];
      
      console.log(`🗓️ [MONTHLY FETCH] Fetching attendance for month: ${targetMonth}`);
      console.log(`📅 Date range: ${startDate} to ${endDate}`);
      
      // Implement pagination to fetch all records beyond Supabase's 1000 limit
      let allRecords: any[] = [];
      let start = 0;
      const pageSize = 1000;
      let hasMoreData = true;
      
      while (hasMoreData) {
        console.log(`📄 [PAGINATION] Fetching page starting at ${start} (page size: ${pageSize})`);
        
        const { data, error } = await supabase
          .from('attendance_records')
          .select(`
            *,
            team_member:team_members!team_member_id(id, full_name, shift),
            recorded_by_member:team_members!recorded_by(full_name)
          `)
          .gte('date', startDate)
          .lte('date', endDate)
          .range(start, start + pageSize - 1)
          .order('date', { ascending: true });

        if (error) {
          throw error;
        }

        const fetchedCount = data?.length || 0;
        console.log(`📊 [PAGINATION] Fetched ${fetchedCount} records in this batch`);
        
        if (data && data.length > 0) {
          allRecords = [...allRecords, ...data];
          
          // Check if we got fewer records than requested, indicating we've reached the end
          if (fetchedCount < pageSize) {
            hasMoreData = false;
            console.log(`✅ [PAGINATION] Reached end of data (got ${fetchedCount} < ${pageSize})`);
          } else {
            start += pageSize;
            console.log(`➡️ [PAGINATION] Moving to next page, total so far: ${allRecords.length}`);
          }
        } else {
          hasMoreData = false;
          console.log(`✅ [PAGINATION] No more data available`);
        }
      }

      console.log(`📊 [MONTHLY FETCH] Total records fetched: ${allRecords.length}`);
      console.log(`🔍 [MONTHLY FETCH] Records for 2025-09-28:`, allRecords.filter(r => r.date === '2025-09-28'));
      console.log(`📋 [MONTHLY FETCH] All dates in response:`, [...new Set(allRecords.map(r => r.date))].sort());

      setAttendanceRecords(allRecords);
    } catch (err: any) {
      console.error('Error fetching monthly attendance:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const markAttendance = async (attendanceData: {
    teamMemberId: string;
    date: string;
    status: 'on_time' | 'late' | 'no_show' | 'day_off' | 'left_early' | 'late_and_left_early';
    clockInTime?: string;
    clockOutTime?: string;
    notes?: string;
  }) => {
    try {
      if (!user) throw new Error('User not authenticated');

      // Check if record exists first
      const { data: existingRecord } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('team_member_id', attendanceData.teamMemberId)
        .eq('date', attendanceData.date)
        .maybeSingle();

      let result;
      
      if (existingRecord) {
        // Update existing record
        const updateData: any = {
          recorded_by: user.id,
          updated_at: new Date().toISOString()
        };
        
        // Handle multi-select case (late + left_early)
        if (attendanceData.status === 'late_and_left_early') {
          updateData.status = 'late_and_left_early';
          updateData.clock_in_time = attendanceData.clockInTime || null;
          updateData.clock_out_time = attendanceData.clockOutTime || null;
          updateData.notes = null; // No need for notes with dedicated status
        } else if (attendanceData.status === 'late') {
          updateData.clock_in_time = attendanceData.clockInTime || null;
          updateData.clock_out_time = null;
          updateData.status = 'late';
        } else if (attendanceData.status === 'left_early') {
          updateData.clock_out_time = attendanceData.clockOutTime || null;
          updateData.clock_in_time = null;
          updateData.status = 'left_early';
        } else if (attendanceData.status === 'no_show') {
          updateData.status = 'no_show';
          updateData.notes = attendanceData.notes || null;
          updateData.clock_in_time = null;
          updateData.clock_out_time = null;
        } else if (attendanceData.status === 'day_off') {
          updateData.status = 'day_off';
          updateData.notes = attendanceData.notes || null;
          updateData.clock_in_time = null;
          updateData.clock_out_time = null;
        } else {
          // on_time - clear all time fields
          updateData.status = 'on_time';
          updateData.clock_in_time = null;
          updateData.clock_out_time = null;
          updateData.notes = null;
        }

        result = await supabase
          .from('attendance_records')
          .update(updateData)
          .eq('id', existingRecord.id)
          .select(`
            *,
            team_member:team_members!team_member_id(id, full_name, shift),
            recorded_by_member:team_members!recorded_by(full_name)
          `)
          .single();
      } else {
        // Insert new record - include tenant_id for RLS
        let insertData: AttendanceInsert = {
          team_member_id: attendanceData.teamMemberId,
          date: attendanceData.date,
          status: attendanceData.status,
          clock_in_time: (attendanceData.status === 'late' || attendanceData.status === 'late_and_left_early') ? (attendanceData.clockInTime || null) : null,
          clock_out_time: (attendanceData.status === 'left_early' || attendanceData.status === 'late_and_left_early') ? (attendanceData.clockOutTime || null) : null,
          notes: attendanceData.notes || null,
          recorded_by: user.id,
          tenant_id: tenant?.id || teamMember?.tenant_id || null
        };
        
        result = await supabase
          .from('attendance_records')
          .insert(insertData)
          .select(`
            *,
            team_member:team_members!team_member_id(id, full_name, shift),
            recorded_by_member:team_members!recorded_by(full_name)
          `)
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      const data = result.data;

      // Update local state
      setAttendanceRecords(prev => {
        const existingIndex = prev.findIndex(r => 
          r.team_member_id === attendanceData.teamMemberId && 
          r.date === attendanceData.date
        );
        
        if (existingIndex >= 0) {
          // Replace existing record
          const newRecords = [...prev];
          newRecords[existingIndex] = data;
          return newRecords;
        } else {
          // Add new record
          return [data, ...prev];
        }
      });

      return { data, error: null };
    } catch (err: any) {
      console.error('Error marking attendance:', err);
      return { data: null, error: err.message };
    }
  };

  const deleteAttendance = async (attendanceId: string) => {
    try {
      const { error } = await supabase
        .from('attendance_records')
        .delete()
        .eq('id', attendanceId);

      if (error) {
        throw error;
      }

      // Remove from local state
      setAttendanceRecords(prev => prev.filter(r => r.id !== attendanceId));
      return { error: null };
    } catch (err: any) {
      console.error('Error deleting attendance:', err);
      return { error: err.message };
    }
  };


  useEffect(() => {
    if (viewMode === 'daily' && date) {
      fetchAttendance(date);
    } else if (viewMode === 'monthly' && month) {
      fetchMonthlyAttendance(month);
    }
  }, [date, month, viewMode]);

  return {
    attendanceRecords,
    loading,
    error,
    fetchAttendance,
    fetchMonthlyAttendance,
    markAttendance,
    deleteAttendance
  };
};