import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';

// Type definitions
export type TenantShift = Database['public']['Tables']['tenant_shifts']['Row'];
export type TenantShiftInsert = Database['public']['Tables']['tenant_shifts']['Insert'];
export type TenantShiftUpdate = Database['public']['Tables']['tenant_shifts']['Update'];

// Shift with team member count for admin display
export interface TenantShiftWithCount extends TenantShift {
  team_member_count?: number;
}

// Helper type for shift filter options
export interface ShiftFilterOption {
  value: string; // 'all' or shift.id
  label: string; // 'All Shifts' or shift.name
  slug: string;  // '' for all, or shift.slug
  color?: string;
}

/**
 * Hook for managing tenant shifts
 * Provides CRUD operations and utility functions for shift management
 */
export const useTenantShifts = () => {
  const { user, teamMember } = useAuth();
  const { tenant } = useTenant();
  const [shifts, setShifts] = useState<TenantShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tenantId = tenant?.id || teamMember?.tenant_id;

  // Fetch all shifts for the current tenant
  const fetchShifts = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('tenant_shifts')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setShifts(data || []);
    } catch (err: any) {
      console.error('Error fetching tenant shifts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // Create a new shift
  const createShift = async (shiftData: Omit<TenantShiftInsert, 'tenant_id'>): Promise<{ data: TenantShift | null; error: string | null }> => {
    if (!tenantId) {
      return { data: null, error: 'No tenant context available' };
    }

    try {
      const { data, error: insertError } = await supabase
        .from('tenant_shifts')
        .insert({
          ...shiftData,
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Update local state
      setShifts(prev => [...prev, data].sort((a, b) => a.display_order - b.display_order));

      return { data, error: null };
    } catch (err: any) {
      console.error('Error creating shift:', err);
      return { data: null, error: err.message };
    }
  };

  // Update an existing shift
  const updateShift = async (shiftId: string, updates: TenantShiftUpdate): Promise<{ data: TenantShift | null; error: string | null }> => {
    try {
      const { data, error: updateError } = await supabase
        .from('tenant_shifts')
        .update(updates)
        .eq('id', shiftId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Update local state
      setShifts(prev => 
        prev.map(shift => shift.id === shiftId ? data : shift)
          .sort((a, b) => a.display_order - b.display_order)
      );

      return { data, error: null };
    } catch (err: any) {
      console.error('Error updating shift:', err);
      return { data: null, error: err.message };
    }
  };

  // Soft delete a shift (set is_active to false)
  const deleteShift = async (shiftId: string): Promise<{ error: string | null }> => {
    try {
      const { error: deleteError } = await supabase
        .from('tenant_shifts')
        .update({ is_active: false })
        .eq('id', shiftId);

      if (deleteError) {
        throw deleteError;
      }

      // Remove from local state
      setShifts(prev => prev.filter(shift => shift.id !== shiftId));

      return { error: null };
    } catch (err: any) {
      console.error('Error deleting shift:', err);
      return { error: err.message };
    }
  };

  // Reorder shifts
  const reorderShifts = async (orderedShiftIds: string[]): Promise<{ error: string | null }> => {
    try {
      // Update each shift with its new display_order
      const updates = orderedShiftIds.map((id, index) => 
        supabase
          .from('tenant_shifts')
          .update({ display_order: index })
          .eq('id', id)
      );

      await Promise.all(updates);

      // Update local state
      setShifts(prev => {
        const shiftMap = new Map(prev.map(s => [s.id, s]));
        return orderedShiftIds
          .map((id, index) => {
            const shift = shiftMap.get(id);
            return shift ? { ...shift, display_order: index } : null;
          })
          .filter((s): s is TenantShift => s !== null);
      });

      return { error: null };
    } catch (err: any) {
      console.error('Error reordering shifts:', err);
      return { error: err.message };
    }
  };

  // Get shift filter options for dropdowns (includes "All Shifts" option)
  const shiftFilterOptions = useMemo((): ShiftFilterOption[] => {
    const options: ShiftFilterOption[] = [
      { value: 'all', label: 'All Shifts', slug: '' }
    ];

    shifts.forEach(shift => {
      options.push({
        value: shift.id,
        label: `${shift.name} (${formatTimeRange(shift.start_time, shift.end_time)})`,
        slug: shift.slug,
        color: shift.color,
      });
    });

    return options;
  }, [shifts]);

  // Get a shift by ID
  const getShiftById = useCallback((shiftId: string | null): TenantShift | undefined => {
    if (!shiftId) return undefined;
    return shifts.find(s => s.id === shiftId);
  }, [shifts]);

  // Get a shift by slug (for backward compatibility with legacy shift values)
  const getShiftBySlug = useCallback((slug: string | null): TenantShift | undefined => {
    if (!slug) return undefined;
    return shifts.find(s => s.slug === slug);
  }, [shifts]);

  // Calculate missed hours based on shift times
  const calculateMissedHours = useCallback((
    shift: TenantShift | undefined,
    clockInTime: string | null,
    clockOutTime: string | null,
    status: string
  ): number => {
    if (!shift) return 0;

    let totalMissedHours = 0;
    const isOvernight = isOvernightShift(shift.start_time, shift.end_time);

    // Calculate late hours
    if (clockInTime && (status === 'late' || status === 'late_and_left_early')) {
      const shiftStartMinutes = timeToMinutes(shift.start_time);
      let clockInMinutes = timeToMinutes(clockInTime);

      // Handle overnight shifts
      if (isOvernight && clockInMinutes < shiftStartMinutes) {
        clockInMinutes += 24 * 60; // Next day
      }

      if (clockInMinutes > shiftStartMinutes) {
        totalMissedHours += (clockInMinutes - shiftStartMinutes) / 60;
      }
    }

    // Calculate early departure hours
    if (clockOutTime && (status === 'left_early' || status === 'late_and_left_early')) {
      let shiftEndMinutes = timeToMinutes(shift.end_time);
      const clockOutMinutes = timeToMinutes(clockOutTime);

      // Handle overnight shifts
      if (isOvernight) {
        shiftEndMinutes += 24 * 60; // Next day
      }

      if (clockOutMinutes < shiftEndMinutes) {
        // For overnight, clock out might be before midnight (same logic)
        let adjustedClockOut = clockOutMinutes;
        if (isOvernight && clockOutMinutes < timeToMinutes(shift.start_time)) {
          adjustedClockOut += 24 * 60;
        }
        
        if (adjustedClockOut < shiftEndMinutes) {
          totalMissedHours += (shiftEndMinutes - adjustedClockOut) / 60;
        }
      }
    }

    return totalMissedHours;
  }, []);

  // Check if shifts are configured
  const hasShifts = shifts.length > 0;

  // Fetch shifts on mount and when tenant changes
  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  return {
    shifts,
    loading,
    error,
    hasShifts,
    fetchShifts,
    createShift,
    updateShift,
    deleteShift,
    reorderShifts,
    shiftFilterOptions,
    getShiftById,
    getShiftBySlug,
    calculateMissedHours,
  };
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert time string (HH:MM or HH:MM:SS) to minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const parts = time.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  return hours * 60 + minutes;
}

/**
 * Check if a shift spans overnight (end time is before start time)
 */
export function isOvernightShift(startTime: string, endTime: string): boolean {
  return timeToMinutes(endTime) < timeToMinutes(startTime);
}

/**
 * Format time range for display (e.g., "10:00 AM - 6:00 PM")
 */
export function formatTimeRange(startTime: string, endTime: string): string {
  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return minutes === 0 ? `${displayHours}${period}` : `${displayHours}:${minutes.toString().padStart(2, '0')}${period}`;
  };

  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

/**
 * Format time for display (e.g., "10:00 AM")
 */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return minutes === 0 ? `${displayHours}:00 ${period}` : `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Calculate shift duration in hours
 */
export function calculateShiftDuration(startTime: string, endTime: string): number {
  let startMinutes = timeToMinutes(startTime);
  let endMinutes = timeToMinutes(endTime);

  // Handle overnight shifts
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  return (endMinutes - startMinutes) / 60;
}

/**
 * Get color classes for a shift
 */
export function getShiftColorClasses(color: string): { bg: string; text: string; border: string; bgLight: string } {
  const colorMap: Record<string, { bg: string; text: string; border: string; bgLight: string }> = {
    blue: { bg: 'bg-blue-600', text: 'text-blue-700', border: 'border-blue-500', bgLight: 'bg-blue-100' },
    purple: { bg: 'bg-purple-600', text: 'text-purple-700', border: 'border-purple-500', bgLight: 'bg-purple-100' },
    indigo: { bg: 'bg-indigo-600', text: 'text-indigo-700', border: 'border-indigo-500', bgLight: 'bg-indigo-100' },
    green: { bg: 'bg-green-600', text: 'text-green-700', border: 'border-green-500', bgLight: 'bg-green-100' },
    orange: { bg: 'bg-orange-600', text: 'text-orange-700', border: 'border-orange-500', bgLight: 'bg-orange-100' },
    red: { bg: 'bg-red-600', text: 'text-red-700', border: 'border-red-500', bgLight: 'bg-red-100' },
    teal: { bg: 'bg-teal-600', text: 'text-teal-700', border: 'border-teal-500', bgLight: 'bg-teal-100' },
    pink: { bg: 'bg-pink-600', text: 'text-pink-700', border: 'border-pink-500', bgLight: 'bg-pink-100' },
  };

  return colorMap[color] || colorMap.blue;
}

export default useTenantShifts;

