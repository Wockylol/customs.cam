import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { useAuth } from '../contexts/AuthContext';

type ChatterAssignment = Database['public']['Tables']['chatter_assignments']['Row'];
type ChatterAssignmentInsert = Database['public']['Tables']['chatter_assignments']['Insert'];

interface ChatterAssignmentWithDetails extends ChatterAssignment {
  chatter?: {
    id: string;
    full_name: string;
    email: string;
    shift: string | null;
  };
  client?: {
    id: string;
    username: string;
    phone: string | null;
    avatar_url: string | null;
  };
  client_platform?: {
    id: string;
    account_name: string | null;
    username_on_platform: string | null;
    platform: {
      id: string;
      name: string;
      color: string;
      icon: string | null;
    };
  };
  assigned_by_member?: {
    full_name: string;
  };
}

export const useChatterAssignments = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<ChatterAssignmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = async () => {
    try {
      // Don't clear existing data during refetch to prevent UI flicker
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('chatter_assignments')
        .select(`
          *,
          chatter:team_members!chatter_id(id, full_name, email, shift),
          client:clients!client_id(id, username, phone, avatar_url),
          assigned_by_member:team_members!assigned_by(full_name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Only process if we got data
      if (data) {
        // Fetch client platforms separately for assignments that have client_platform_id
        const assignmentsWithPlatforms = await Promise.all(
          data.map(async (assignment) => {
            if (assignment.client_platform_id) {
              const { data: platformData } = await supabase
                .from('client_platforms')
                .select(`
                  id,
                  account_name,
                  username_on_platform,
                  platform:platforms(id, name, color, icon)
                `)
                .eq('id', assignment.client_platform_id)
                .single();
              
              return {
                ...assignment,
                client_platform: platformData
              };
            }
            return assignment;
          })
        );

        setAssignments(assignmentsWithPlatforms);
      }
    } catch (err: any) {
      console.error('Error fetching chatter assignments:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const assignChatterToClient = async (
    chatterId: string, 
    clientId: string, 
    notes?: string, 
    clientPlatformId?: string
  ) => {
    try {
      if (!user) throw new Error('User not authenticated');

      const insertData: ChatterAssignmentInsert = {
        chatter_id: chatterId,
        client_id: clientId,
        client_platform_id: clientPlatformId || null,
        assigned_by: user.id,
        notes: notes || null,
        is_active: true
      };

      const { data, error } = await supabase
        .from('chatter_assignments')
        .insert(insertData)
        .select(`
          *,
          chatter:team_members!chatter_id(id, full_name, email, shift),
          client:clients!client_id(id, username, phone, avatar_url),
          assigned_by_member:team_members!assigned_by(full_name)
        `)
        .single();

      if (error) {
        throw error;
      }

      // Fetch client platform data if needed
      let assignmentWithPlatform = data;
      if (data.client_platform_id) {
        const { data: platformData } = await supabase
          .from('client_platforms')
          .select(`
            id,
            account_name,
            username_on_platform,
            platform:platforms(id, name, color, icon)
          `)
          .eq('id', data.client_platform_id)
          .single();
        
        assignmentWithPlatform = {
          ...data,
          client_platform: platformData
        };
      }

      // Add to local state
      setAssignments(prev => [assignmentWithPlatform, ...prev]);
      return { data, error: null };
    } catch (err: any) {
      console.error('Error assigning chatter to client:', err);
      return { data: null, error: err.message };
    }
  };

  const removeAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('chatter_assignments')
        .update({ is_active: false })
        .eq('id', assignmentId);

      if (error) {
        throw error;
      }

      // Remove from local state
      setAssignments(prev => prev.filter(assignment => assignment.id !== assignmentId));
      return { error: null };
    } catch (err: any) {
      console.error('Error removing assignment:', err);
      return { error: err.message };
    }
  };

  const updateAssignmentNotes = async (assignmentId: string, notes: string) => {
    try {
      const { data, error } = await supabase
        .from('chatter_assignments')
        .update({ notes })
        .eq('id', assignmentId)
        .select(`
          *,
          chatter:team_members!chatter_id(id, full_name, email, shift),
          client:clients!client_id(id, username, phone, avatar_url),
          assigned_by_member:team_members!assigned_by(full_name)
        `)
        .single();

      if (error) {
        throw error;
      }

      // Fetch client platform data if needed
      let assignmentWithPlatform = data;
      if (data.client_platform_id) {
        const { data: platformData } = await supabase
          .from('client_platforms')
          .select(`
            id,
            account_name,
            username_on_platform,
            platform:platforms(id, name, color, icon)
          `)
          .eq('id', data.client_platform_id)
          .single();
        
        assignmentWithPlatform = {
          ...data,
          client_platform: platformData
        };
      }

      // Update local state
      setAssignments(prev => 
        prev.map(assignment => 
          assignment.id === assignmentId ? assignmentWithPlatform : assignment
        )
      );
      return { data, error: null };
    } catch (err: any) {
      console.error('Error updating assignment notes:', err);
      return { data: null, error: err.message };
    }
  };

  const getChatterAssignments = (chatterId: string) => {
    return assignments.filter(assignment => assignment.chatter_id === chatterId);
  };

  const getClientAssignments = (clientId: string) => {
    return assignments.filter(assignment => assignment.client_id === clientId);
  };

  const isAssigned = (chatterId: string, clientId: string) => {
    return assignments.some(assignment => 
      assignment.chatter_id === chatterId && 
      assignment.client_id === clientId
    );
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  return {
    assignments,
    loading,
    error,
    fetchAssignments,
    assignChatterToClient,
    removeAssignment,
    updateAssignmentNotes,
    getChatterAssignments,
    getClientAssignments,
    isAssigned
  };
};