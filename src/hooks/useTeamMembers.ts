import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type TeamMember = Database['public']['Tables']['team_members']['Row'];
type TeamMemberUpdate = Database['public']['Tables']['team_members']['Update'];

export const useTeamMembers = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamMembers = async () => {
    try {
      // Don't clear existing data during refetch to prevent UI flicker
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Only update if we got data
      if (data) {
        setTeamMembers(data);
      }
    } catch (err: any) {
      console.error('Error fetching team members:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateTeamMember = async (memberId: string, updateData: {
    role?: 'admin' | 'manager' | 'chatter' | 'pending';
    isActive?: boolean;
    fullName?: string;
    email?: string;
    shift?: string;
  }) => {
    try {
      const updatePayload: TeamMemberUpdate = {};
      
      if (updateData.role !== undefined) updatePayload.role = updateData.role;
      if (updateData.isActive !== undefined) updatePayload.is_active = updateData.isActive;
      if (updateData.fullName !== undefined) updatePayload.full_name = updateData.fullName;
      if (updateData.email !== undefined) updatePayload.email = updateData.email;
      if (updateData.shift !== undefined) updatePayload.shift = updateData.shift || null;

      const { data, error } = await supabase
        .from('team_members')
        .update(updatePayload)
        .eq('id', memberId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update local state
      setTeamMembers(prev => 
        prev.map(member => 
          member.id === memberId ? data : member
        )
      );

      return { data, error: null };
    } catch (err: any) {
      console.error('Error updating team member:', err);
      return { data: null, error: err.message };
    }
  };

  const deleteTeamMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) {
        throw error;
      }

      // Remove the team member from local state
      setTeamMembers(prev => prev.filter(member => member.id !== memberId));
      return { error: null };
    } catch (err: any) {
      console.error('Error deleting team member:', err);
      return { error: err.message };
    }
  };

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  return {
    teamMembers,
    loading,
    error,
    fetchTeamMembers,
    updateTeamMember,
    deleteTeamMember
  };
};