import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ThreadNote {
  id: string;
  thread_id: number;
  content: string;
  source_message: string;
  message_id?: string;
  created_at: string;
  thread?: {
    id: number;
    group_id: string;
    name: string | null;
  };
}

export const useThreadNotes = (clientId?: string) => {
  const [threadNotes, setThreadNotes] = useState<ThreadNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchThreadNotes = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // First get all threads for this client
      const { data: threads, error: threadsError } = await supabase
        .from('threads')
        .select('id, group_id, name')
        .eq('client_id', id);

      if (threadsError) {
        throw threadsError;
      }

      if (!threads || threads.length === 0) {
        setThreadNotes([]);
        return;
      }

      const threadIds = threads.map(t => t.id);

      // Get all notes for these threads
      const { data: notes, error: notesError } = await supabase
        .from('thread_notes')
        .select('*')
        .in('thread_id', threadIds)
        .order('created_at', { ascending: false });

      if (notesError) {
        throw notesError;
      }

      // Attach thread info to each note
      const notesWithThreads = (notes || []).map(note => ({
        ...note,
        thread: threads.find(t => t.id === note.thread_id)
      }));

      setThreadNotes(notesWithThreads);
    } catch (err: any) {
      console.error('Error fetching thread notes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchThreadNotes(clientId);
    }
  }, [clientId]);

  return {
    threadNotes,
    loading,
    error,
    fetchThreadNotes
  };
};