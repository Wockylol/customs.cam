import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { useAuth } from '../contexts/AuthContext';

export interface CustomNote {
  id: string;
  custom_request_id: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  team_member?: {
    id: string;
    full_name: string;
    role: string;
  };
}

export const useCustomNotes = (customRequestId?: string) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<CustomNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = async (requestId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('custom_notes')
        .select(`
          *,
          team_member:team_members!created_by(id, full_name, role)
        `)
        .eq('custom_request_id', requestId)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      setNotes(data || []);
    } catch (err: any) {
      console.error('Error fetching custom notes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addNote = async (customRequestId: string, content: string) => {
    try {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('custom_notes')
        .insert({
          custom_request_id: customRequestId,
          content: content.trim(),
          created_by: user.id
        })
        .select(`
          *,
          team_member:team_members!created_by(id, full_name, role)
        `)
        .single();

      if (error) {
        throw error;
      }

      // Add to local state
      setNotes(prev => [...prev, data]);
      return { data, error: null };
    } catch (err: any) {
      console.error('Error adding custom note:', err);
      return { data: null, error: err.message };
    }
  };

  const updateNote = async (noteId: string, content: string) => {
    try {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('custom_notes')
        .update({ content: content.trim() })
        .eq('id', noteId)
        .eq('created_by', user.id) // Only allow editing own notes
        .select(`
          *,
          team_member:team_members!created_by(id, full_name, role)
        `)
        .single();

      if (error) {
        throw error;
      }

      // Update local state
      setNotes(prev => 
        prev.map(note => 
          note.id === noteId ? data : note
        )
      );
      return { data, error: null };
    } catch (err: any) {
      console.error('Error updating custom note:', err);
      return { data: null, error: err.message };
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('custom_notes')
        .delete()
        .eq('id', noteId)
        .eq('created_by', user.id); // Only allow deleting own notes

      if (error) {
        throw error;
      }

      // Remove from local state
      setNotes(prev => prev.filter(note => note.id !== noteId));
      return { error: null };
    } catch (err: any) {
      console.error('Error deleting custom note:', err);
      return { error: err.message };
    }
  };

  useEffect(() => {
    if (customRequestId) {
      fetchNotes(customRequestId);
    }
  }, [customRequestId]);

  return {
    notes,
    loading,
    error,
    fetchNotes,
    addNote,
    updateNote,
    deleteNote
  };
};